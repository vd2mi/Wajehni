from __future__ import annotations

import json
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI

from models import (
    CourseFile,
    ExplainRequest,
    ExplainResponse,
    ScheduleRequest,
    ScheduleResponse,
    ScheduleDay,
    MajorAssistRequest,
    MajorAssistResponse,
)
from rag import RAGEngine, extract_page_text
from safety import SAFETY_SYSTEM_BLOCK, check_blocked
from tools import generate_schedule, generate_major_report

load_dotenv()

LOGS_DIR = Path(__file__).parent / "logs"
LOGS_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOGS_DIR / "wajehni.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger("wajehni")

DATA_DIR = Path(__file__).resolve().parent / "data"
COURSES_PATH = DATA_DIR / "courses.json"

EXPLAIN_SYSTEM_PROMPT = f"""
{SAFETY_SYSTEM_BLOCK}
<role>
You are an educational assistant called Wajehni (وجهني).
Your job is to explain course material clearly and thoroughly.
</role>

<instructions>
- Read the provided context chunks carefully
- Explain the content the student is asking about clearly and in detail
- Use examples when helpful
- Reference specific parts of the slides when relevant
- You have access to conversation history — use it to understand follow-up questions
- Respond in the language specified in the language tag:
  - If language is "ar": respond entirely in Arabic
  - If language is "en": respond entirely in English
  - If language is "both": write each section in English first, then immediately below it write the Arabic translation of that same section. Use a blank line between the two. Do this for every paragraph/section so the reader sees both side by side vertically.
- When you see a "explain_page" request, give a detailed breakdown of everything on that page/slide
- At the end of your explanation, add a "Vocabulary / مفردات" section listing technical or advanced terms (above B1 English level) found in the content. For each term show: the English term, its Arabic translation, and a short definition.
</instructions>
"""

courses_db: list[CourseFile] = []
openai_client: OpenAI | None = None
rag_engine: RAGEngine | None = None


def load_courses() -> list[CourseFile]:
    if not COURSES_PATH.exists():
        logger.warning("courses.json not found at %s", COURSES_PATH)
        return []
    with open(COURSES_PATH, encoding="utf-8") as f:
        raw = json.load(f)
    return [CourseFile(**entry) for entry in raw]


@asynccontextmanager
async def lifespan(app: FastAPI):
    global courses_db, openai_client, rag_engine

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        logger.error("OPENAI_API_KEY is not set")
        raise RuntimeError("OPENAI_API_KEY environment variable is required")

    openai_client = OpenAI(api_key=api_key)
    rag_engine = RAGEngine(openai_client)
    courses_db = load_courses()

    logger.info("Loaded %d courses", len(courses_db))

    for course in courses_db:
        indexed = rag_engine.index_course(course.course_id, course.files)
        logger.info("Course %s: %d chunks indexed", course.course_id, indexed)

    yield

    logger.info("Shutting down Wajehni")


app = FastAPI(
    title="Wajehni API",
    description="AI Study Assistant for Arabic-speaking students",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_openai() -> OpenAI:
    if openai_client is None:
        raise HTTPException(status_code=503, detail="OpenAI client not initialized")
    return openai_client


def get_rag() -> RAGEngine:
    if rag_engine is None:
        raise HTTPException(status_code=503, detail="RAG engine not initialized")
    return rag_engine


@app.get("/courses", response_model=list[CourseFile])
async def list_courses():
    return courses_db


@app.post("/explain", response_model=ExplainResponse)
async def explain(request: ExplainRequest):
    blocked = check_blocked(request.question)
    if blocked:
        return ExplainResponse(answer=blocked, sources=[])

    engine = get_rag()
    client = get_openai()

    course_exists = any(c.course_id == request.course_id for c in courses_db)
    if not course_exists:
        raise HTTPException(status_code=404, detail=f"Course {request.course_id} not found")

    lang = request.language or "ar"
    source_ids: list[str] = []

    if request.page_number is not None and request.filename:
        pdf_path = DATA_DIR / request.filename
        if not pdf_path.exists():
            raise HTTPException(status_code=404, detail="PDF file not found")
        page_text = extract_page_text(pdf_path, request.page_number)
        if not page_text.strip():
            no_text = "لا يوجد نص في هذه الصفحة." if lang == "ar" else "No text found on this page."
            return ExplainResponse(answer=no_text, sources=[])
        context_xml = f'<context>\n<page number="{request.page_number}">\n{page_text}\n</page>\n</context>'
    else:
        chunks = engine.retrieve(request.course_id, request.question)
        if not chunks:
            no_info = (
                "لم أجد معلومات كافية في المادة للإجابة على سؤالك. تأكد من رفع ملفات المقرر."
                if lang == "ar"
                else "I couldn't find enough information in the course material. Make sure you've uploaded the course files."
            )
            return ExplainResponse(answer=no_info, sources=[])
        context_xml = engine.build_context_xml(chunks)
        source_ids = [c.chunk_id for c in chunks]

    messages: list[dict[str, str]] = [
        {"role": "system", "content": EXPLAIN_SYSTEM_PROMPT},
    ]

    if request.history:
        messages.append({
            "role": "user",
            "content": f"<language>{lang}</language>\n{context_xml}\n\n<question>{request.history[0].content}</question>",
        })
        for msg in request.history[1:]:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({
            "role": "user",
            "content": f"<language>{lang}</language>\n{context_xml}\n\n<question>{request.question}</question>",
        })
    else:
        messages.append({
            "role": "user",
            "content": f"<language>{lang}</language>\n{context_xml}\n\n<question>{request.question}</question>",
        })

    response = client.chat.completions.create(
        model="gpt-4o",
        temperature=0.3,
        messages=messages,
    )

    answer = response.choices[0].message.content or ""
    logger.info("Explain request for %s answered (%d sources)", request.course_id, len(source_ids))

    return ExplainResponse(answer=answer, sources=source_ids)


@app.post("/upload-pdf")
async def upload_pdf(course_id: str = Form(...), file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    engine = get_rag()

    save_path = DATA_DIR / file.filename
    content = await file.read()
    with open(save_path, "wb") as f:
        f.write(content)

    course = next((c for c in courses_db if c.course_id == course_id), None)
    if course is None:
        new_course = CourseFile(
            course_id=course_id,
            title=course_id,
            major="Uploaded",
            files=[file.filename],
        )
        courses_db.append(new_course)
    elif file.filename not in course.files:
        course.files.append(file.filename)

    if course_id in engine.course_indices:
        del engine.course_indices[course_id]

    all_files = next((c.files for c in courses_db if c.course_id == course_id), [])
    indexed = engine.index_course(course_id, all_files)

    logger.info("Uploaded %s for course %s, indexed %d chunks", file.filename, course_id, indexed)
    return {"status": "ok", "chunks_indexed": indexed}


@app.post("/schedule", response_model=ScheduleResponse)
async def schedule(request: ScheduleRequest):
    client = get_openai()

    try:
        raw_schedule = generate_schedule(
            client,
            tasks=request.tasks,
            deadline=request.deadline,
            hours_per_day=request.hours_per_day,
        )
    except Exception as exc:
        logger.error("Schedule generation failed: %s", exc)
        raise HTTPException(status_code=500, detail="فشل إنشاء الجدول. حاول مرة أخرى.")

    days = [ScheduleDay(**day) for day in raw_schedule]
    logger.info("Generated schedule with %d days", len(days))

    return ScheduleResponse(schedule=days)


@app.post("/major-assist", response_model=MajorAssistResponse)
async def major_assist(request: MajorAssistRequest):
    blocked = check_blocked(str(request.answers))
    if blocked:
        return MajorAssistResponse(report_markdown=blocked)

    client = get_openai()
    report = generate_major_report(client, request.answers)

    logger.info("Generated major assist report (%d chars)", len(report))
    return MajorAssistResponse(report_markdown=report)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=7860,
        reload=True,
        reload_excludes=["logs/*", "*.log"],
    )

# وجهني — Wajehni

**An AI-powered study assistant built for Arabic-speaking university students.**

Wajehni lets you upload course PDFs and interact with them through three tools: a deep RAG-based explainer, a study schedule generator, and a major-selection advisor. The interface is bilingual (Arabic/English), RTL-first, and renders LaTeX math natively.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Backend](#backend)
  - [API Endpoints](#api-endpoints)
  - [RAG Engine](#rag-engine)
  - [Prompt System](#prompt-system)
  - [Safety Layer](#safety-layer)
  - [Data Models](#data-models)
- [Frontend](#frontend)
  - [Pages](#pages)
  - [Components](#components)
  - [API Client](#api-client)
- [Getting Started](#getting-started)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Running with Docker](#running-with-docker)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
  - [Course Catalog](#course-catalog)
- [Tech Stack](#tech-stack)

---

## Features

### شرح المادة — Course Explainer

- Upload any course PDF and view it side-by-side with an AI panel
- Three explain modes from a single dropdown button:
  - **شرح مختصر** — brief, high-level overview (key points only)
  - **شرح تفصيلي** — full detailed breakdown with examples, vocabulary section, and LaTeX math
  - **ترجم الصفحة** — faithful full-page translation (EN → AR or AR → EN)
- **اختبرني** — generates 5 practice questions from any page
- Persistent chat thread per session — follow-up questions retain full conversation history
- Language toggle: Arabic, English, or bilingual side-by-side
- LaTeX math rendered via KaTeX for all mathematical expressions

### جدول الدراسة — Study Scheduler

- Input any number of study tasks with a deadline and daily hours budget
- GPT-4o distributes tasks across all available days, alternating subjects and placing review sessions near the deadline
- Output is an Arabic day-by-day schedule rendered as a clean card list

### اختيار التخصص — Major Advisor

- 4-step questionnaire covering interests, skills, work preferences, and academic strengths
- GPT-4o produces a full Markdown report recommending 3–5 majors with personalized reasoning

---

## Architecture

```
┌──────────────────────────────────────┐
│           Next.js 14 Frontend        │
│  (React, Tailwind, shadcn/ui, RTL)   │
└────────────────┬─────────────────────┘
                 │ HTTP (fetch)
                 ▼
┌──────────────────────────────────────┐
│          FastAPI Backend             │
│          localhost:7860              │
│                                      │
│  ┌─────────────┐  ┌────────────────┐ │
│  │  RAG Engine │  │  Tools         │ │
│  │  (FAISS +   │  │  (schedule,    │ │
│  │  OpenAI     │  │   major)       │ │
│  │  embeddings)│  └────────────────┘ │
│  └──────┬──────┘                     │
│         │                            │
│  ┌──────▼──────┐                     │
│  │  GPT-4o     │ ← OpenAI API        │
│  └─────────────┘                     │
└──────────────────────────────────────┘
```

The frontend and backend are completely decoupled. The frontend talks to the backend over a single `NEXT_PUBLIC_API_URL` env variable, making it trivial to deploy them separately.

---

## Project Structure

```
Wajehni/
│
├── HF/                          # Backend (FastAPI)
│   ├── main.py                  # App entry point, all route handlers
│   ├── models.py                # Pydantic request/response models
│   ├── rag.py                   # RAG engine (chunking, embedding, FAISS)
│   ├── tools.py                 # Schedule and major report generators
│   ├── safety.py                # Content filtering + system prompt block
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example
│   └── data/
│       └── courses.json         # Course catalog (seeded on startup)
│
└── frontend/                    # Frontend (Next.js 14)
    └── src/
        ├── app/
        │   ├── layout.tsx       # Root layout (IBM Plex Sans Arabic, RTL, Navbar)
        │   ├── page.tsx         # Home / landing page
        │   ├── explain/
        │   │   └── page.tsx     # Course explainer page
        │   ├── schedule/
        │   │   └── page.tsx     # Study scheduler page
        │   └── major/
        │       └── page.tsx     # Major advisor page
        ├── components/
        │   ├── pdf-viewer.tsx   # PDF display + action buttons
        │   ├── navbar.tsx       # Top navigation bar
        │   ├── theme-toggle.tsx # Light/dark theme switcher
        │   └── ui/              # shadcn/ui component library
        └── lib/
            ├── api.ts           # Typed API client
            └── utils.ts         # cn() class merge helper
```

---

## Backend

### API Endpoints

#### `GET /courses`

Returns the full course catalog loaded from `data/courses.json`.

**Response:** `CourseFile[]`

---

#### `POST /explain`

The core endpoint. Handles page explanations, translations, and free-form chat questions using RAG retrieval.

**Request body:**


| Field         | Type                      | Default      | Description                                                     |
| ------------- | ------------------------- | ------------ | --------------------------------------------------------------- |
| `course_id`   | `string`                  | required     | Course identifier                                               |
| `question`    | `string`                  | required     | The user's question or prompt                                   |
| `language`    | `"ar" | "en" | "both"`    | `"ar"`       | Response language                                               |
| `page_number` | `int | null`              | `null`       | If set, extracts exact page text instead of using RAG retrieval |
| `filename`    | `string | null`           | `null`       | Required if `page_number` is set                                |
| `history`     | `ChatMessage[]`           | `[]`         | Previous conversation turns                                     |
| `depth`       | `"brief" | "detailed"`    | `"detailed"` | Controls explanation depth                                      |
| `mode`        | `"explain" | "translate"` | `"explain"`  | Switches between explain and translate system prompts           |


**Response:** `{ answer: string, sources: string[] }`

When `page_number` + `filename` are provided, the endpoint extracts raw text from that exact page via PyMuPDF and feeds it directly into the prompt — no retrieval step. Otherwise, it runs semantic search over the course index and returns the top-5 most relevant chunks.

---

#### `POST /upload-pdf`

Accepts a `multipart/form-data` upload. Saves the file to `data/`, registers it with the course, clears the old FAISS index for that course, and re-indexes all files.

**Form fields:** `course_id`, `file` (PDF only)

**Response:** `{ status: "ok", chunks_indexed: int }`

---

#### `POST /schedule`

Generates a day-by-day study schedule.

**Request body:**


| Field           | Type                  | Default  |
| --------------- | --------------------- | -------- |
| `tasks`         | `string[]`            | required |
| `deadline`      | `string` (YYYY-MM-DD) | required |
| `hours_per_day` | `int` (1–16)          | `4`      |


**Response:** `{ schedule: [{ day: string, tasks: string[] }] }`

The backend builds an explicit list of all available dates from today to the deadline (including Arabic weekday names) and passes them to GPT-4o with a `response_format: json_object` constraint to ensure structured output.

---

#### `POST /major-assist`

Generates a major recommendation report from a student profile.

**Request body:** `{ answers: { interests, skills, work_preferences, academic_strengths } }`

**Response:** `{ report_markdown: string }`

---

### RAG Engine

Located in `rag.py`. The pipeline on upload:

1. **Text extraction** — PyMuPDF (`fitz`) extracts plain text from every page of every PDF
2. **Chunking** — text is tokenized with `tiktoken` (GPT-4o tokenizer) and split into chunks of **800 tokens** with **120-token overlap**. Each chunk gets an MD5-based `chunk_id` derived from `course_id:filename:start_offset`
3. **Embedding** — OpenAI `text-embedding-3-large` (3072 dimensions) in batches of 128
4. **Indexing** — embeddings are L2-normalized and added to a `faiss.IndexFlatIP` (inner product = cosine similarity after normalization)

On retrieval:

1. The query is embedded with the same model
2. The embedding is L2-normalized
3. FAISS returns top-5 nearest chunks
4. Chunks are assembled into an XML context block capped at **6,000 tokens** and injected into the prompt

**Key constants:**


| Constant          | Value                    |
| ----------------- | ------------------------ |
| `CHUNK_SIZE`      | 800 tokens               |
| `CHUNK_OVERLAP`   | 120 tokens               |
| `EMBEDDING_MODEL` | `text-embedding-3-large` |
| `EMBEDDING_DIM`   | 3072                     |
| `TOP_K`           | 5 chunks                 |
| Max context       | 6,000 tokens             |


---

### Prompt System

The explain prompt is assembled dynamically at request time by `build_system_prompt(mode, depth)` rather than being a static string. This avoids bloated prompts and lets each mode carry exactly the instructions it needs.

**Mode: `explain` + depth `brief`**
Instructs the model to produce a short, bullet-pointed overview. Skips minor details. No vocabulary section.

**Mode: `explain` + depth `detailed`**
Full breakdown of the page. Uses examples, references specific slide content, and appends a **Vocabulary / مفردات** section listing technical terms (above B1 English level) with Arabic translations and definitions.

**Mode: `translate`**
Instructs faithful, structure-preserving translation with no summarization. Automatically detects direction (English → Arabic or Arabic → English) based on content. Technical terms appear in parentheses in the original language.

All modes share:

- The `SAFETY_SYSTEM_BLOCK` (see below)
- LaTeX math formatting rules (`$...$` for inline, `$$...$$` for block)
- Language response rules (Arabic / English / bilingual)

The **schedule** and **major** tools each have their own static system prompts defined in `tools.py`.

---

### Safety Layer

`safety.py` defines a lightweight content filter applied to all user inputs before any LLM call:

- **Pattern matching** — rejects requests that match homework/exam completion patterns (Arabic and English regex patterns)
- **System block** — a `<safety>` XML block injected at the top of every system prompt that instructs the model to explain and teach, but never write essays or complete graded assignments

If a question is blocked, the endpoint returns a soft refusal message in Arabic without calling OpenAI.

---

### Data Models

Defined in `models.py` using Pydantic v2.


| Model                 | Fields                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------- |
| `CourseFile`          | `course_id`, `title`, `title_ar`, `major`, `files: list[str]`                                |
| `ChatMessage`         | `role: str`, `content: str`                                                                  |
| `ExplainRequest`      | `course_id`, `question`, `language`, `page_number?`, `filename?`, `history`, `depth`, `mode` |
| `ExplainResponse`     | `answer: str`, `sources: list[str]`                                                          |
| `ScheduleRequest`     | `tasks`, `deadline`, `hours_per_day`                                                         |
| `ScheduleResponse`    | `schedule: list[ScheduleDay]`                                                                |
| `ScheduleDay`         | `day: str`, `tasks: list[str]`                                                               |
| `MajorAssistRequest`  | `answers: dict[str, str | list[str]]`                                                        |
| `MajorAssistResponse` | `report_markdown: str`                                                                       |


---

## Frontend

### Pages

#### `/` — Home

Landing page with navigation cards to the three tools.

#### `/explain` — Course Explainer

Two-phase UI:

**Setup phase** (before PDF upload):

- Course selector (dropdown from `/courses` endpoint, or custom ID input)
- Language selector (segmented button: العربية / English / Both)
- Drag-and-drop / click PDF upload with upload progress state

**Main phase** (after upload):

- Left panel: PDF viewer with page navigation
- Right panel: explanation output + chat thread
- Top bar: filename display + language toggle
- "اشرح" dropdown button with three options (brief / detailed / translate)
- "اختبرني" button generates practice questions for the current page
- Chat input (Enter to send, Shift+Enter for newline) with full conversation history
- All AI output rendered as Markdown with KaTeX math

**Math preprocessing:** Before rendering, a `preprocessMath()` function normalizes any `\(...\)` or `\[...\]` LaTeX delimiters the model might output into `$...$` and `$$...$$` for KaTeX compatibility.

#### `/schedule` — Study Scheduler

- Task input with Enter-to-add and badge display
- Deadline date picker
- Hours/day number input (1–16)
- Results rendered as a scrollable day list (Arabic weekday name + ISO date + task bullets)

#### `/major` — Major Advisor

- 4-step linear questionnaire with a progress bar
- Steps: interests → skills → work preferences → academic strengths
- Each step requires non-empty input to advance
- Results rendered as a Markdown report in a card

---

### Components

#### `pdf-viewer.tsx`

Wraps `react-pdf` (`Document` + `Page`) in a flex layout with:

- Page navigation (prev/next with bounds checking)
- "اختبرني" button
- "اشرح" dropdown menu (Radix `DropdownMenu`) with brief, detailed, and translate options
- Responsive width — listens to `ResizeObserver` equivalent via window resize to fit the container

Exports the `ExplainAction` discriminated union type:

```ts
type ExplainAction =
  | { kind: "explain"; depth: "brief" | "detailed" }
  | { kind: "translate" }
```

#### `navbar.tsx`

Fixed top navigation with links to all three tools and a theme toggle.

#### `theme-toggle.tsx`

Light/dark toggle using `localStorage` and a `data-theme` attribute.

#### `ui/`

shadcn/ui components: `Button`, `Card`, `Input`, `Label`, `Select`, `Textarea`, `Badge`, `ScrollArea`, `Separator`, `DropdownMenu`.

---

### API Client

`src/lib/api.ts` — fully typed wrapper around `fetch`. All requests go to `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:7860`).

```ts
explainQuestion(
  course_id, question, history,
  language, page_number?, filename?,
  depth, mode
): Promise<ExplainResponse>

uploadPdf(course_id, file): Promise<{ status, chunks_indexed }>
getCourses(): Promise<Course[]>
generateSchedule(tasks, deadline, hours_per_day): Promise<ScheduleResponse>
getMajorAssist(answers): Promise<MajorAssistResponse>
```

---

## Getting Started

### Backend Setup

**Requirements:** Python 3.11+, an OpenAI API key

```bash
cd HF

# Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Create your .env file
copy .env.example .env
# Edit .env and set OPENAI_API_KEY=sk-...

# Run the server
python main.py
```

The API will be available at `http://localhost:7860`.  
Interactive docs: `http://localhost:7860/docs`

On startup the backend:

1. Reads `data/courses.json`
2. For each course, finds its PDFs in `data/`, extracts text, chunks it, embeds it, and builds a FAISS index
3. Logs `Course <id>: <n> chunks indexed` for each course

---

### Frontend Setup

**Requirements:** Node.js 18+

```bash
cd frontend

npm install

# Create .env.local if your backend is not on localhost:7860
# echo NEXT_PUBLIC_API_URL=http://localhost:7860 > .env.local

npm run dev
```

The app will be available at `http://localhost:3000`.

---

### Running with Docker

```bash
cd HF

# Build the image
docker build -t wajehni-api .

# Run with your API key
docker run -p 7860:7860 -e OPENAI_API_KEY=sk-... wajehni-api
```

To persist uploaded PDFs across container restarts, mount the data directory:

```bash
docker run -p 7860:7860 \
  -e OPENAI_API_KEY=sk-... \
  -v $(pwd)/data:/app/data \
  wajehni-api
```

---

## Configuration

### Environment Variables


| Variable              | Location              | Description                                                      |
| --------------------- | --------------------- | ---------------------------------------------------------------- |
| `OPENAI_API_KEY`      | `HF/.env`             | Required. Used for embeddings and all GPT-4o calls.              |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | Optional. Backend base URL. Defaults to `http://localhost:7860`. |


### Course Catalog

`HF/data/courses.json` defines the courses available in the dropdown. Each entry:

```json
{
  "course_id": "CS101",
  "title": "Introduction to Programming",
  "title_ar": "مقدمة في البرمجة",
  "major": "Computer Science",
  "files": ["intro_to_programming.pdf"]
}
```

- `course_id` — unique identifier used in all API calls
- `files` — list of PDF filenames expected in `HF/data/`. Missing files are skipped with a warning.
- `title_ar` — shown in the course selector dropdown (falls back to `title` if empty)

PDFs uploaded through the UI are automatically added to the matching course entry (or a new one is created if the course ID doesn't exist). The catalog is held in memory; changes survive the session but are not written back to `courses.json`.

---

## Tech Stack

### Backend


| Package       | Version | Purpose                         |
| ------------- | ------- | ------------------------------- |
| FastAPI       | 0.115.6 | API framework                   |
| Uvicorn       | 0.34.0  | ASGI server                     |
| Pydantic      | 2.10.4  | Data validation and models      |
| OpenAI        | 1.58.1  | GPT-4o completions + embeddings |
| PyMuPDF       | 1.25.1  | PDF text extraction             |
| tiktoken      | 0.8.0   | Token counting and chunking     |
| faiss-cpu     | 1.9.0   | Vector similarity search        |
| NumPy         | 1.26.4  | Embedding array operations      |
| python-dotenv | 1.0.1   | .env file loading               |


### Frontend


| Package                       | Version | Purpose                         |
| ----------------------------- | ------- | ------------------------------- |
| Next.js                       | 14.2    | React framework (App Router)    |
| React                         | 18      | UI library                      |
| Tailwind CSS                  | 3.4     | Utility-first styling           |
| shadcn/ui                     | —       | Component library (Radix-based) |
| @radix-ui/react-dropdown-menu | —       | Accessible dropdown primitives  |
| react-pdf                     | 10.4    | In-browser PDF rendering        |
| react-markdown                | 10.1    | Markdown rendering              |
| remark-math                   | 6.0     | LaTeX math parsing              |
| rehype-katex                  | 7.0     | LaTeX → HTML rendering          |
| KaTeX                         | 0.16    | Math typesetting engine         |
| lucide-react                  | 0.577   | Icon library                    |
| IBM Plex Sans Arabic          | —       | Primary font (Arabic + Latin)   |



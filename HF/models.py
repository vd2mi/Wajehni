from pydantic import BaseModel, Field


class CourseFile(BaseModel):
    course_id: str
    title: str
    title_ar: str = ""
    major: str
    files: list[str]


class ChatMessage(BaseModel):
    role: str
    content: str


class ExplainRequest(BaseModel):
    course_id: str
    question: str
    language: str = "ar"
    page_number: int | None = None
    filename: str | None = None
    history: list[ChatMessage] = Field(default_factory=list)


class ExplainResponse(BaseModel):
    answer: str
    sources: list[str]


class ScheduleRequest(BaseModel):
    tasks: list[str]
    deadline: str
    hours_per_day: int = Field(default=4, ge=1, le=16)


class ScheduleDay(BaseModel):
    day: str
    tasks: list[str]


class ScheduleResponse(BaseModel):
    schedule: list[ScheduleDay]


class MajorAssistRequest(BaseModel):
    answers: dict[str, str | list[str]]


class MajorAssistResponse(BaseModel):
    report_markdown: str


class ErrorResponse(BaseModel):
    detail: str

import re

BLOCKED_PATTERNS: list[re.Pattern] = [
    re.compile(r"(اكتب|أكتب)\s+(لي\s+)?(مقال|بحث|تقرير)\s+(كامل|جاهز)", re.IGNORECASE),
    re.compile(r"(solve|write)\s+(my|this)\s+(homework|assignment|exam|essay)", re.IGNORECASE),
    re.compile(r"(do|finish|complete)\s+(my|this)\s+(homework|assignment|exam)", re.IGNORECASE),
]

REFUSAL_MESSAGE_AR = (
    "أعتذر، لا يمكنني حل الواجب أو كتابة الإجابة نيابةً عنك، "
    "لكن يمكنني شرح الفكرة أو المفهوم حتى تتمكن من الحل بنفسك."
)

SAFETY_SYSTEM_BLOCK = """
<safety>
You are an educational assistant. You MUST:
- Explain any content from the uploaded course materials thoroughly
- Answer any question the student has about the slides, PDFs, or lecture content
- Summarize, translate, and clarify anything in the uploaded files
- Help students understand every concept in their course materials

You must NEVER:
- Write full essays or research papers from scratch for the student
- Complete take-home exams when the student explicitly says it is a graded exam

When in doubt, ALWAYS explain. Your primary job is to teach and clarify.
</safety>
"""


def check_blocked(user_input: str) -> str | None:
    for pattern in BLOCKED_PATTERNS:
        if pattern.search(user_input):
            return REFUSAL_MESSAGE_AR
    return None

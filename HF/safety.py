import re

BLOCKED_PATTERNS: list[re.Pattern] = [
    re.compile(r"(حل|أجب|جاوب).*(واجب|تمرين|اختبار|امتحان|مسألة)", re.IGNORECASE),
    re.compile(r"(اكتب|أكتب).*(مقال|بحث|تقرير|إجابة|حل)", re.IGNORECASE),
    re.compile(r"(solve|answer|complete|write).*(homework|assignment|exam|essay|quiz)", re.IGNORECASE),
    re.compile(r"(do|finish).*(my|this).*(homework|assignment|project|exam)", re.IGNORECASE),
    re.compile(r"(give me|send me).*(answer|solution|حل|إجابة)", re.IGNORECASE),
]

REFUSAL_MESSAGE_AR = (
    "أعتذر، لا يمكنني حل الواجب أو كتابة الإجابة نيابةً عنك، "
    "لكن يمكنني شرح الفكرة أو المفهوم حتى تتمكن من الحل بنفسك."
)

SAFETY_SYSTEM_BLOCK = """
<safety>
You are an educational assistant. You must NEVER:
- Write essays, assignments, or homework solutions for the student
- Provide direct answers to exam or quiz questions
- Complete any graded work on behalf of the student

If a student asks you to do any of the above, refuse politely in Arabic and offer to explain the underlying concept instead.

Your role is strictly to:
- Explain concepts from course slides and materials
- Clarify ideas the student finds confusing
- Summarize content for review purposes
- Help the student build understanding so they can solve problems independently
</safety>
"""


def check_blocked(user_input: str) -> str | None:
    for pattern in BLOCKED_PATTERNS:
        if pattern.search(user_input):
            return REFUSAL_MESSAGE_AR
    return None

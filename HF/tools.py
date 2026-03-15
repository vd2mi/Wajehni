from __future__ import annotations

import json
import logging
from datetime import date, datetime, timedelta

from openai import OpenAI

from safety import SAFETY_SYSTEM_BLOCK

logger = logging.getLogger("wajehni.tools")

ARABIC_DAY_NAMES = {
    0: "الإثنين",
    1: "الثلاثاء",
    2: "الأربعاء",
    3: "الخميس",
    4: "الجمعة",
    5: "السبت",
    6: "الأحد",
}

SCHEDULE_SYSTEM_PROMPT = f"""
{SAFETY_SYSTEM_BLOCK}
<role>
You are a study schedule planner for Arabic-speaking university students.
</role>

<instructions>
- You will receive a list of study tasks, the available dates, and hours per day
- You MUST use ALL the provided dates — spread the work across the entire period
- Break large tasks (like "3 Chapters") into individual sessions across multiple days
- Mix subjects across days so the student alternates between topics
- Place review sessions in the final 2-3 days before the deadline
- Keep each daily task description SHORT (under 10 words)
- Do NOT skip any date from the provided list
- Do NOT add dates that are not in the provided list
- Respond ONLY with valid JSON matching the schema — no markdown, no explanation
</instructions>

<output_schema>
{{
  "schedule": [
    {{
      "day": "exact date string from the provided dates list",
      "tasks": ["short task description"]
    }}
  ]
}}
</output_schema>
"""

MAJOR_ASSIST_SYSTEM_PROMPT = f"""
{SAFETY_SYSTEM_BLOCK}
<role>
You are an academic major advisor for Arabic-speaking students.
Based on a student's self-reported interests, skills, work preferences, and academic strengths,
recommend suitable university majors with clear reasoning.
</role>

<instructions>
- Recommend 3 to 5 majors
- For each major, explain why it fits the student's profile
- Write the full report in Arabic using Markdown
- Use headers, bullet points, and clear structure
- Be encouraging but honest
</instructions>

<output_format>
Respond with a Markdown report in Arabic. Example structure:

# التخصصات الموصى بها

## علوم الحاسب
لماذا يناسبك: ...

## الهندسة الصناعية
لماذا يناسبك: ...
</output_format>
"""


def build_date_list(start: date, end: date) -> list[str]:
    dates: list[str] = []
    current = start
    while current <= end:
        weekday_ar = ARABIC_DAY_NAMES[current.weekday()]
        formatted = f"{weekday_ar} {current.strftime('%Y-%m-%d')}"
        dates.append(formatted)
        current += timedelta(days=1)
    return dates


def generate_schedule(
    client: OpenAI,
    tasks: list[str],
    deadline: str,
    hours_per_day: int,
) -> list[dict]:
    today = date.today()

    try:
        deadline_date = datetime.strptime(deadline, "%Y-%m-%d").date()
    except ValueError:
        deadline_date = today + timedelta(days=7)

    if deadline_date <= today:
        deadline_date = today + timedelta(days=3)

    available_dates = build_date_list(today, deadline_date)
    total_days = len(available_dates)

    user_message = (
        f"<tasks>\n{json.dumps(tasks, ensure_ascii=False)}\n</tasks>\n"
        f"<today>{today.isoformat()}</today>\n"
        f"<deadline>{deadline}</deadline>\n"
        f"<total_days>{total_days}</total_days>\n"
        f"<hours_per_day>{hours_per_day}</hours_per_day>\n"
        f"<available_dates>\n{json.dumps(available_dates, ensure_ascii=False)}\n</available_dates>"
    )

    response = client.chat.completions.create(
        model="gpt-4o",
        temperature=0.3,
        max_tokens=8192,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SCHEDULE_SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
    )

    raw_text = response.choices[0].message.content or "{}"

    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        logger.error("Failed to parse schedule JSON: %s", raw_text[:500])
        return []

    return parsed.get("schedule", [])


def generate_major_report(
    client: OpenAI,
    answers: dict[str, str | list[str]],
) -> str:
    formatted_answers = "\n".join(
        f"<{key}>{value}</{key}>" for key, value in answers.items()
    )
    user_message = f"<student_profile>\n{formatted_answers}\n</student_profile>"

    response = client.chat.completions.create(
        model="gpt-4o",
        temperature=0.5,
        messages=[
            {"role": "system", "content": MAJOR_ASSIST_SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
    )

    return response.choices[0].message.content or ""

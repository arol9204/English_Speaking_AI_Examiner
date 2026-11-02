"""Feedback on writing and speaking answers, using each exam's own criteria and scale.

The same prompt is used for the local model (as JSON) and for the "Copy for Claude" button,
so you can paste an answer into claude.ai for a second opinion at no cost.
"""

import json

from ..exams import EXAMS_BY_KEY, TASKS_BY_KEY
from . import llm


def feedback_schema(criteria: list[str], levels: list[str], per_answer: bool = False) -> dict:
    criterion = {
        "type": "object",
        "properties": {"level": {"type": "string", "enum": levels}, "comment": {"type": "string"}},
        "required": ["level", "comment"],
    }
    schema = {
        "type": "object",
        "properties": {
            "criteria": {
                "type": "object",
                "properties": {c: criterion for c in criteria},
                "required": criteria,
            },
            "overall_level": {"type": "string", "enum": levels},
            "strengths": {"type": "array", "items": {"type": "string"}},
            "improvements": {"type": "array", "items": {"type": "string"}},
            "corrections": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "original": {"type": "string"},
                        "corrected": {"type": "string"},
                        "explanation": {"type": "string"},
                    },
                    "required": ["original", "corrected", "explanation"],
                },
            },
            "improved_answer": {"type": "string"},
        },
        "required": ["criteria", "overall_level", "strengths", "improvements", "corrections",
                     "improved_answer"],
    }
    if per_answer:
        schema["properties"]["per_answer"] = {"type": "array", "items": {"type": "string"}}
        schema["required"].append("per_answer")
    return schema


def _duration(seconds: int) -> str:
    if seconds >= 120 and seconds % 60 == 0:
        return f"{seconds // 60} minutes"
    return f"{seconds} seconds"


def build_prompt(task_key: str, question: str, answer: str, metrics: dict,
                 has_photo: bool = False, for_claude: bool = False) -> str:
    task = TASKS_BY_KEY[task_key]
    exam = EXAMS_BY_KEY[task["exam"]]
    scale = exam["scale"]
    spoken = task["kind"] in ("speaking", "conversation")
    timing = f"Time limit: {_duration(task['time_seconds'])}"
    if task.get("prep_seconds"):
        timing += f", after {_duration(task['prep_seconds'])} to prepare"
    lines = [
        f"You are an experienced examiner for the {exam['name']} test.",
        f"Task: {task['name']}. {task['summary']} {timing}.",
    ]
    if has_photo:
        lines.append("The candidate was shown the attached photo. Check that the answer describes "
                     "what is actually in the photo.")
    lines += [
        f"Question shown to the candidate: {question}",
        "",
        "Candidate's answer" + (" (speech-to-text transcript)" if spoken else "") + ":",
        '"""',
        answer.strip() or "(no answer)",
        '"""',
        "",
        "Measurements of the answer:",
        json.dumps(metrics, indent=2),
        "",
        f"Rate each criterion on the {scale['name']} scale ({', '.join(scale['levels'])}).",
    ]
    if scale.get("descriptions"):
        lines.append("What each level means:")
        lines += [f"- {level}: {scale['descriptions'][level]}" for level in reversed(scale["levels"])]
    lines.append("Criteria:")
    lines += [f"- {c} ({exam['criteria'][c]['name']}): {exam['criteria'][c]['description']}"
              for c in task["criteria"]]
    lines += [
        "",
        "Be honest and specific, like a strict but kind teacher. Then give: the main strengths, "
        "the most useful improvements, corrections of actual errors (quote the original words), "
        "and an improved version of the answer that the candidate could realistically produce "
        "in the same time limit.",
    ]
    if spoken:
        lines.append("Ignore missing punctuation and capitals: the transcript was made by a machine.")
    if task_key == "interactive_speaking":
        lines.append("This was a conversation. Judge all answers together. Give one short comment per "
                     "answer, in order (per_answer), and make the improved answer a better version of "
                     "the weakest answer, saying which question it answers.")
    if for_claude:
        lines.append("Format the feedback with clear headings so it is easy to read.")
    return "\n".join(lines)


def get_feedback(task_key: str, question: str, answer: str, metrics: dict,
                 photo_b64: str | None = None) -> dict:
    task = TASKS_BY_KEY[task_key]
    exam = EXAMS_BY_KEY[task["exam"]]
    criteria = task["criteria"]
    prompt = build_prompt(task_key, question, answer, metrics, has_photo=photo_b64 is not None)
    claude_prompt = build_prompt(task_key, question, answer, metrics,
                                 has_photo=photo_b64 is not None, for_claude=True)
    result = {
        "metrics": metrics,
        "claude_prompt": claude_prompt,
        "scale": {"name": exam["scale"]["name"], "levels": exam["scale"]["levels"]},
        "criteria_names": {c: exam["criteria"][c]["name"] for c in criteria},
        "ai": None,
        "ai_error": None,
    }
    if not answer.strip():
        result["ai_error"] = "No answer to grade."
        return result
    try:
        schema = feedback_schema(criteria, exam["scale"]["levels"],
                                 per_answer=task["kind"] == "conversation")
        result["ai"] = llm.chat_json(prompt, schema,
                                     images=[photo_b64] if photo_b64 else None)
    except llm.LLMUnavailable as exc:
        result["ai_error"] = str(exc)
    return result

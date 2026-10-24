"""Feedback on writing and speaking answers using the official DET criteria.

The same prompt is used for the local model (as JSON) and for the "Copy for Claude" button,
so you can paste an answer into claude.ai for a second opinion at no cost.
"""

import json

from ..tasks import TASKS_BY_KEY
from . import llm

LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]

CRITERIA_DESCRIPTIONS = {
    "content": "Does the answer respond to the task fully and develop ideas with details and examples?",
    "coherence": "Discourse coherence: is it well organized, with ideas clearly linked (connectors, "
    "paragraphing or signposting)?",
    "grammar": "Range and accuracy of grammar: variety of structures and how many errors.",
    "lexis": "Range and precision of vocabulary, including less common words and collocations.",
    "fluency": "Speaking speed, smoothness, and how much the speaker pauses, hesitates or uses "
    "fillers. Judge from the speech measurements below, not only the text.",
    "pronunciation": "How clear the speech is. Only an approximation is available: the list of words "
    "the speech recognizer was unsure about. Few unclear words suggests clear speech.",
}


def feedback_schema(criteria: list[str]) -> dict:
    criterion = {
        "type": "object",
        "properties": {"level": {"type": "string", "enum": LEVELS}, "comment": {"type": "string"}},
        "required": ["level", "comment"],
    }
    return {
        "type": "object",
        "properties": {
            "criteria": {
                "type": "object",
                "properties": {c: criterion for c in criteria},
                "required": criteria,
            },
            "overall_level": {"type": "string", "enum": LEVELS},
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


def build_prompt(task_key: str, question: str, answer: str, metrics: dict,
                 has_photo: bool = False, for_claude: bool = False) -> str:
    task = TASKS_BY_KEY[task_key]
    criteria = task["criteria"]
    spoken = "fluency" in criteria
    lines = [
        "You are an experienced examiner for the Duolingo English Test (DET).",
        f"Task: {task['name']} ({task['summary']}) Time limit: {task['time_seconds']} seconds.",
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
        "Rate each criterion on the CEFR scale (A1, A2, B1, B2, C1, C2):",
    ]
    lines += [f"- {c}: {CRITERIA_DESCRIPTIONS[c]}" for c in criteria]
    lines += [
        "",
        "Be honest and specific, like a strict but kind teacher. Then give: the main strengths, "
        "the most useful improvements, corrections of actual errors (quote the original words), "
        "and an improved version of the answer that the candidate could realistically produce "
        "in the same time limit.",
    ]
    if spoken:
        lines.append("Ignore missing punctuation and capitals: the transcript was made by a machine.")
    if for_claude:
        lines.append("Format the feedback with clear headings so it is easy to read.")
    return "\n".join(lines)


def get_feedback(task_key: str, question: str, answer: str, metrics: dict,
                 photo_b64: str | None = None) -> dict:
    criteria = TASKS_BY_KEY[task_key]["criteria"]
    prompt = build_prompt(task_key, question, answer, metrics, has_photo=photo_b64 is not None)
    claude_prompt = build_prompt(task_key, question, answer, metrics,
                                 has_photo=photo_b64 is not None, for_claude=True)
    result = {"metrics": metrics, "claude_prompt": claude_prompt, "ai": None, "ai_error": None}
    if not answer.strip():
        result["ai_error"] = "No answer to grade."
        return result
    try:
        result["ai"] = llm.chat_json(prompt, feedback_schema(criteria),
                                     images=[photo_b64] if photo_b64 else None)
    except llm.LLMUnavailable as exc:
        result["ai_error"] = str(exc)
    return result

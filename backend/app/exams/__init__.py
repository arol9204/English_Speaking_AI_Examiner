"""The English exams the app can practise, and every task they contain.

Each exam package provides EXAM (its catalog: skills, tasks, grading scale and criteria) and the
functions that serve its questions: get_item, check, writing_question and speaking_question.
"""

from . import celpip, det

COMING_LATER = [
    {"key": key, "name": name, "short_name": short, "summary": "Coming later.", "available": False}
    for key, name, short in (
        ("ielts", "IELTS", "IELTS"),
        ("toefl", "TOEFL iBT", "TOEFL"),
        ("pte", "PTE Academic", "PTE"),
    )
]

HANDLERS = {"det": det, "celpip": celpip}
EXAMS = [det.EXAM, celpip.EXAM, *COMING_LATER]
EXAMS_BY_KEY = {exam["key"]: exam for exam in EXAMS}
TASKS_BY_KEY = {
    task["key"]: {**task, "exam": exam["key"]}
    for exam in EXAMS
    for task in exam.get("tasks", [])
}


def exam_summary(exam: dict) -> dict:
    """An exam without its task list, for the landing page."""
    tasks = exam.get("tasks", [])
    return {
        **{k: v for k, v in exam.items() if k not in ("tasks", "criteria", "scale")},
        "criteria_names": {key: c["name"] for key, c in exam.get("criteria", {}).items()},
        "task_count": len(tasks),
        "available_task_count": sum(t["available"] for t in tasks),
    }

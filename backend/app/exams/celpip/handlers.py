"""Serves and checks CELPIP-General questions.

Reading and listening items share one shape: every question has an `id`, `options`, the index of
the right `answer` and an `explanation`. Answers and explanations stay on the server until the
user submits.
"""

import copy

from fastapi import HTTPException

from ... import content
from ...scoring.text_metrics import text_metrics

LISTENING_FILES = {f"celpip_listening_{n}": f"celpip/listening_part{n}" for n in range(1, 7)}
READING_FILES = {f"celpip_reading_{n}": f"celpip/reading_part{n}" for n in range(1, 5)}
WRITING_FILES = {"celpip_writing_1": "celpip/writing_task1", "celpip_writing_2": "celpip/writing_task2"}
SPEAKING_FILES = {
    "celpip_speaking_1": "celpip/speaking_task1",
    "celpip_speaking_2": "celpip/speaking_task2",
    "celpip_speaking_5": "celpip/speaking_task5",
    "celpip_speaking_6": "celpip/speaking_task6",
    "celpip_speaking_7": "celpip/speaking_task7",
    "celpip_speaking_8": "celpip/speaking_task8",
}
PHOTO_TASKS = {"celpip_speaking_3", "celpip_speaking_4"}
HIDDEN_FIELDS = ("answer", "explanation")


def questions(item: dict) -> list[dict]:
    """Every question in a reading or listening item, in the order they are asked."""
    groups = item.get("tasks") or item.get("sections") or []
    return [q for group in groups for q in group.get("questions", [])]


def _without_answers(item: dict) -> dict:
    public = copy.deepcopy(item)
    for q in questions(public):
        for field in HIDDEN_FIELDS:
            q.pop(field, None)
    return public


def get_item(task: dict, level: str | None, seen: set[str]) -> dict:
    key = task["key"]
    if key in LISTENING_FILES:
        return _without_answers(content.random_item(LISTENING_FILES[key], None, seen))
    if key in READING_FILES:
        return _without_answers(content.random_item(READING_FILES[key], None, seen))
    if key in WRITING_FILES:
        return content.random_item(WRITING_FILES[key], None, seen)
    if key in PHOTO_TASKS:
        return content.random_photo(seen)
    if key in SPEAKING_FILES:
        item = dict(content.random_item(SPEAKING_FILES[key], None, seen))
        if "image" in item:
            item["image_url"] = f"/api/celpip/images/{item['image']}"
            item.pop("description", None)  # only the AI examiner needs the written description
        return item
    raise HTTPException(404, f"Unknown or unavailable task {key!r}")


def check(task: dict, item_id: str, answers) -> dict:
    key = task["key"]
    name = LISTENING_FILES.get(key) or READING_FILES.get(key)
    if not name:
        raise HTTPException(404, f"No automatic checking for {key!r}")
    if not isinstance(answers, dict):
        raise HTTPException(400, "answers must map each question id to the chosen option")
    item = content.get_item(name, item_id)
    results = []
    for q in questions(item):
        chosen = answers.get(q["id"])
        results.append({
            "id": q["id"],
            "chosen": chosen,
            "answer": q["answer"],
            "correct": chosen == q["answer"],
            "explanation": q.get("explanation", ""),
        })
    correct = sum(r["correct"] for r in results)
    return {"score": correct / len(results), "correct": correct, "total": len(results),
            "results": results}


NO_CHOICE = ("The candidate did not mark which option they chose; work it out from the answer.")


def _option(options: list[dict], key: str | None) -> dict | None:
    for option in options:
        if option["key"] == key:
            return option
    if key is not None:
        raise HTTPException(400, f"Unknown option {key!r}")
    return None


def _describe(option: dict) -> str:
    return f"{option['title']} ({'; '.join(option.get('details', []))})"


def writing_question(task: dict, body) -> tuple[str, str, dict, str | None]:
    item = content.get_item(WRITING_FILES[task["key"]], body.item_id)
    low, high = task["word_range"]
    metrics = {**text_metrics(body.answer), "required_words": f"{low}-{high}"}
    if task["key"] == "celpip_writing_1":
        question = item["prompt"] + "\nIn the email, the candidate must:\n" + "\n".join(
            f"- {b}" for b in item["bullets"])
    else:
        chosen = _option(item["options"], body.choice)
        question = (f"{item['context']}\n{item['question']}\n"
                    + "\n".join(f"Option {o['key']}: {o['text']}" for o in item["options"]) + "\n"
                    + (f"The candidate chose Option {chosen['key']} and must explain why." if chosen
                       else NO_CHOICE))
    question += f"\nRequired length: {low}-{high} words."
    return question, body.answer, metrics, None


def speaking_question(task: dict, body) -> tuple[str, str | None]:
    key = task["key"]
    instruction = task["instruction"]
    if key in PHOTO_TASKS:
        return instruction, content.photo_b64(body.item_id)
    item = content.get_item(SPEAKING_FILES[key], body.item_id)
    if key == "celpip_speaking_5":
        chosen = _option(item["options"], body.choice) or item["options"][0]
        options = "\n".join(f"Option {o['key']}: {_describe(o)}" for o in item["options"])
        return (f"{item['scenario']}\n{options}\nThe candidate chose Option {chosen['key']}. "
                f"{item['other_person'].capitalize()} prefers: {_describe(item['other'])}.\n"
                f"Task: persuade {item['other_person']} that {chosen['title']} is the better choice."), None
    if key == "celpip_speaking_6":
        chosen = _option(item["choices"], body.choice)
        choices = "\n".join(f"Option {c['key']}: {c['text']}" for c in item["choices"])
        note = f"The candidate chose Option {chosen['key']}." if chosen else NO_CHOICE
        return f"{item['scenario']}\n{choices}\n{note}", None
    if key == "celpip_speaking_8":
        return (f"{instruction}\nSituation: {item['scenario']}\n"
                f"The picture (which the AI examiner cannot see) shows: {item['description']}"), None
    return f"{instruction}\n{item['prompt']}", None

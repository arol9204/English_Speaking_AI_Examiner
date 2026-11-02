"""Serves and checks DET questions."""

import random

from fastapi import HTTPException

from ... import content
from ...generators import c_test, read_and_select
from ...scoring.dictation import score_dictation
from ...scoring.text_metrics import text_metrics

PROMPT_FILES = {
    "interactive_writing": "det/writing_prompts",
    "writing_sample": "det/writing_prompts",
    "read_then_speak": "det/speaking_prompts",
    "speaking_sample": "det/speaking_prompts",
}
PHOTO_TASKS = {"write_about_the_photo", "speak_about_the_photo"}


def _level(level: str | None) -> str:
    if level is None:
        return random.choice(content.LEVELS)
    if level not in content.LEVELS:
        raise HTTPException(400, f"level must be one of {content.LEVELS}")
    return level


def get_item(task: dict, level: str | None, seen: set[str]) -> dict:
    key = task["key"]
    if key == "read_and_select":
        lvl = _level(level)
        seed = random.randint(0, 10**9)
        words = read_and_select.make_set(lvl, seed)
        return {"id": f"{lvl}:{seed}", "level": lvl, "words": [w["word"] for w in words]}
    if key == "fill_in_the_blanks":
        item = content.random_item("det/fill_in_the_blanks", level, seen)
        blank = c_test.make_blank(item["sentence"])
        blank.pop("answer")
        return {"id": item["id"], "level": item["level"], **blank}
    if key == "read_and_complete":
        item = content.random_item("det/read_and_complete", level, seen)
        test = c_test.make_c_test(item["passage"])
        return {"id": item["id"], "level": item["level"], "title": item["title"],
                "segments": test["segments"]}
    if key == "listen_and_type":
        # The browser reads the sentence aloud, so the text has to be sent to it.
        item = content.random_item("det/listen_and_type", level, seen)
        return {"id": item["id"], "level": item["level"], "text": item["text"]}
    if key in PROMPT_FILES:
        item = content.random_item(PROMPT_FILES[key], None, seen)
        if key != "interactive_writing":
            item = {k: v for k, v in item.items() if k != "follow_up"}
        return item
    if key == "interactive_speaking":
        # Two topics with 3-4 questions each (6-8 in total), as on the real test.
        topics = content.load("det/interactive_speaking")["topics"]
        fresh = [t for t in topics if t["id"] not in seen]
        chosen = random.sample(fresh if len(fresh) >= 2 else topics, 2)
        chosen = [{**t, "questions": t["questions"][:random.choice((3, 4))]} for t in chosen]
        return {"id": ",".join(t["id"] for t in chosen), "topics": chosen}
    if key in PHOTO_TASKS:
        return content.random_photo(seen)
    raise HTTPException(404, f"Unknown or unavailable task {key!r}")


def check(task: dict, item_id: str, answers) -> dict:
    key = task["key"]
    if key == "read_and_select":
        level, _, seed = item_id.partition(":")
        words = read_and_select.make_set(_level(level), int(seed))
        answers = list(answers) + [None] * (len(words) - len(answers))
        results = [{"word": w["word"], "real": w["real"], "answer": a, "correct": a == w["real"]}
                   for w, a in zip(words, answers)]
        return {"score": sum(r["correct"] for r in results) / len(results), "results": results}
    if key == "fill_in_the_blanks":
        item = content.get_item("det/fill_in_the_blanks", item_id)
        blank = c_test.make_blank(item["sentence"])
        typed = str(answers).strip().lower()
        correct = typed == blank["answer"].lower()
        return {"score": float(correct), "correct": correct, "answer": blank["answer"],
                "word": blank["prefix"] + blank["answer"]}
    if key == "read_and_complete":
        item = content.get_item("det/read_and_complete", item_id)
        expected = c_test.make_c_test(item["passage"])["answers"]
        typed = list(answers) + [""] * (len(expected) - len(answers))
        results = [{"answer": a, "typed": t or "", "correct": (t or "").strip().lower() == a.lower()}
                   for a, t in zip(expected, typed)]
        return {"score": sum(r["correct"] for r in results) / len(results), "results": results}
    if key == "listen_and_type":
        item = content.get_item("det/listen_and_type", item_id)
        return score_dictation(item["text"], str(answers))
    raise HTTPException(404, f"No automatic checking for {key!r}")


def writing_question(task: dict, body) -> tuple[str, str, dict, str | None]:
    """Return (question, answer, metrics, photo) for the AI examiner."""
    key = task["key"]
    if key == "write_about_the_photo":
        return ("Write a description of the photo.", body.answer, text_metrics(body.answer),
                content.photo_b64(body.item_id))
    if key == "interactive_writing":
        item = content.get_item("det/writing_prompts", body.item_id)
        question = f"Part 1: {item['prompt']}\nPart 2 (follow-up): {item['follow_up']}"
        answer = f"Part 1:\n{body.answer}\n\nPart 2:\n{body.answer_part2 or ''}"
        metrics = {"part1": text_metrics(body.answer), "part2": text_metrics(body.answer_part2 or "")}
        return question, answer, metrics, None
    question = content.get_item("det/writing_prompts", body.item_id)["prompt"]
    return question, body.answer, text_metrics(body.answer), None


def speaking_question(task: dict, body) -> tuple[str, str | None]:
    """Return (question, photo) for the AI examiner."""
    key = task["key"]
    if key == "speak_about_the_photo":
        return "Describe the photo out loud.", content.photo_b64(body.item_id)
    item = content.get_item("det/speaking_prompts", body.item_id)
    return item["prompt"] + " Points to cover: " + "; ".join(item["bullets"]), None

"""DET Practice API. Run with: uvicorn app.main:app --reload (from the backend/ folder)."""

import base64
import random
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import content
from .ai import fluency, llm, rubric, stt
from .config import FRONTEND_DIST, PHOTOS_DIR
from .generators import c_test, read_and_select
from .scoring.dictation import score_dictation
from .scoring.text_metrics import text_metrics
from .tasks import TASKS, TASKS_BY_KEY

app = FastAPI(title="DET Practice")

PROMPT_FILES = {
    "interactive_writing": "writing_prompts",
    "writing_sample": "writing_prompts",
    "read_then_speak": "speaking_prompts",
    "speaking_sample": "speaking_prompts",
}
PHOTO_TASKS = {"write_about_the_photo", "speak_about_the_photo"}


def _level(level: str | None) -> str:
    if level is None:
        return random.choice(content.LEVELS)
    if level not in content.LEVELS:
        raise HTTPException(400, f"level must be one of {content.LEVELS}")
    return level


def _photo_path(name: str) -> Path:
    if name not in content.list_photos():
        raise HTTPException(404, f"Unknown photo {name!r}")
    return PHOTOS_DIR / name


@app.get("/api/status")
def get_status():
    return {"llm": llm.status(), "stt": stt.status(), "photos": len(content.list_photos())}


@app.get("/api/tasks")
def get_tasks():
    return TASKS


@app.get("/api/items/{task}")
def get_item(task: str, level: str | None = None, exclude: str = ""):
    seen = set(filter(None, exclude.split(",")))
    if task == "read_and_select":
        lvl = _level(level)
        seed = random.randint(0, 10**9)
        words = read_and_select.make_set(lvl, seed)
        return {"id": f"{lvl}:{seed}", "level": lvl, "words": [w["word"] for w in words]}
    if task == "fill_in_the_blanks":
        item = content.random_item("fill_in_the_blanks", level, seen)
        blank = c_test.make_blank(item["sentence"])
        blank.pop("answer")
        return {"id": item["id"], "level": item["level"], **blank}
    if task == "read_and_complete":
        item = content.random_item("read_and_complete", level, seen)
        test = c_test.make_c_test(item["passage"])
        return {"id": item["id"], "level": item["level"], "title": item["title"],
                "segments": test["segments"]}
    if task == "listen_and_type":
        # The browser reads the sentence aloud, so the text has to be sent to it.
        item = content.random_item("listen_and_type", level, seen)
        return {"id": item["id"], "level": item["level"], "text": item["text"]}
    if task in PROMPT_FILES:
        item = content.random_item(PROMPT_FILES[task], None, seen)
        if task != "interactive_writing":
            item = {k: v for k, v in item.items() if k != "follow_up"}
        return item
    if task == "interactive_speaking":
        # Two topics with 3-4 questions each (6-8 in total), as on the real test.
        topics = content.load("interactive_speaking")["topics"]
        fresh = [t for t in topics if t["id"] not in seen]
        chosen = random.sample(fresh if len(fresh) >= 2 else topics, 2)
        chosen = [{**t, "questions": t["questions"][:random.choice((3, 4))]} for t in chosen]
        return {"id": ",".join(t["id"] for t in chosen), "topics": chosen}
    if task in PHOTO_TASKS:
        photos = content.list_photos()
        if not photos:
            raise HTTPException(404, "No photos yet. Add .jpg/.png files to content/photos/.")
        fresh = [p for p in photos if p not in seen] or photos
        name = random.choice(fresh)
        return {"id": name, "url": f"/api/photos/{name}"}
    raise HTTPException(404, f"Unknown or unavailable task {task!r}")


@app.get("/api/photos/{name}")
def get_photo(name: str):
    return FileResponse(_photo_path(name))


class CheckRequest(BaseModel):
    item_id: str
    answers: list[bool | None] | list[str] | str


@app.post("/api/check/{task}")
def check(task: str, body: CheckRequest):
    if task == "read_and_select":
        level, _, seed = body.item_id.partition(":")
        words = read_and_select.make_set(_level(level), int(seed))
        answers = list(body.answers) + [None] * (len(words) - len(body.answers))
        results = [{"word": w["word"], "real": w["real"], "answer": a, "correct": a == w["real"]}
                   for w, a in zip(words, answers)]
        return {"score": sum(r["correct"] for r in results) / len(results), "results": results}
    if task == "fill_in_the_blanks":
        item = content.get_item("fill_in_the_blanks", body.item_id)
        blank = c_test.make_blank(item["sentence"])
        typed = str(body.answers).strip().lower()
        correct = typed == blank["answer"].lower()
        return {"score": float(correct), "correct": correct, "answer": blank["answer"],
                "word": blank["prefix"] + blank["answer"]}
    if task == "read_and_complete":
        item = content.get_item("read_and_complete", body.item_id)
        answers = c_test.make_c_test(item["passage"])["answers"]
        typed = list(body.answers) + [""] * (len(answers) - len(body.answers))
        results = [{"answer": a, "typed": t or "", "correct": (t or "").strip().lower() == a.lower()}
                   for a, t in zip(answers, typed)]
        return {"score": sum(r["correct"] for r in results) / len(results), "results": results}
    if task == "listen_and_type":
        item = content.get_item("listen_and_type", body.item_id)
        return score_dictation(item["text"], str(body.answers))
    raise HTTPException(404, f"No automatic checking for {task!r}")


class WritingFeedbackRequest(BaseModel):
    task: str
    item_id: str
    answer: str
    answer_part2: str | None = None


@app.post("/api/feedback/writing")
async def writing_feedback(body: WritingFeedbackRequest):
    if body.task not in ("interactive_writing", "writing_sample", "write_about_the_photo"):
        raise HTTPException(400, f"{body.task!r} is not a writing task")
    photo = None
    if body.task == "write_about_the_photo":
        question = "Write a description of the photo."
        photo = base64.b64encode(_photo_path(body.item_id).read_bytes()).decode()
        answer = body.answer
        metrics = text_metrics(answer)
    elif body.task == "interactive_writing":
        item = content.get_item("writing_prompts", body.item_id)
        question = f"Part 1: {item['prompt']}\nPart 2 (follow-up): {item['follow_up']}"
        answer = f"Part 1:\n{body.answer}\n\nPart 2:\n{body.answer_part2 or ''}"
        metrics = {"part1": text_metrics(body.answer), "part2": text_metrics(body.answer_part2 or "")}
    else:
        question = content.get_item("writing_prompts", body.item_id)["prompt"]
        answer = body.answer
        metrics = text_metrics(answer)
    return await run_in_threadpool(rubric.get_feedback, body.task, question, answer, metrics, photo)


@app.post("/api/transcribe")
async def transcribe(task: str = Form(...), audio: UploadFile = File(...)):
    if task not in TASKS_BY_KEY or "fluency" not in TASKS_BY_KEY[task].get("criteria", []):
        raise HTTPException(400, f"{task!r} is not a speaking task")
    if not stt.installed():
        raise HTTPException(503, "Speech-to-text is not installed. Run: pip install faster-whisper")
    suffix = Path(audio.filename or "answer.webm").suffix or ".webm"
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / f"answer{suffix}"
        path.write_bytes(await audio.read())
        result = await run_in_threadpool(stt.transcribe, str(path))
    result["fluency"] = fluency.fluency_metrics(result["words"], TASKS_BY_KEY[task]["time_seconds"])
    result["strength"] = fluency.answer_strength(result["fluency"])
    return result


class SpeakingFeedbackRequest(BaseModel):
    task: str
    item_id: str
    transcript: str
    fluency: dict


@app.post("/api/feedback/speaking")
async def speaking_feedback(body: SpeakingFeedbackRequest):
    photo = None
    if body.task == "speak_about_the_photo":
        question = "Describe the photo out loud."
        photo = base64.b64encode(_photo_path(body.item_id).read_bytes()).decode()
    elif body.task in ("read_then_speak", "speaking_sample"):
        item = content.get_item("speaking_prompts", body.item_id)
        question = item["prompt"] + " Points to cover: " + "; ".join(item["bullets"])
    else:
        raise HTTPException(400, f"{body.task!r} is not a speaking task")
    metrics = {"speech": body.fluency, "text": text_metrics(body.transcript)}
    return await run_in_threadpool(rubric.get_feedback, body.task, question, body.transcript,
                                   metrics, photo)


class Turn(BaseModel):
    question: str
    transcript: str
    fluency: dict


class ConversationFeedbackRequest(BaseModel):
    turns: list[Turn]


@app.post("/api/feedback/interactive_speaking")
async def conversation_feedback(body: ConversationFeedbackRequest):
    if not body.turns:
        raise HTTPException(400, "No answers to grade")
    question = (f"A conversation of {len(body.turns)} questions on two topics. "
                "The candidate had 35 seconds to answer each question.")
    answer = "\n\n".join(f"Question {i}: {t.question}\nAnswer {i}: {t.transcript.strip() or '(no answer)'}"
                          for i, t in enumerate(body.turns, 1))
    metrics = {
        "per_answer": [t.fluency for t in body.turns],
        "text": text_metrics(" ".join(t.transcript for t in body.turns)),
    }
    return await run_in_threadpool(rubric.get_feedback, "interactive_speaking", question, answer,
                                   metrics)


if FRONTEND_DIST.is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")

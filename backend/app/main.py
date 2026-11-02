"""AI English Examiner API. Run with: uvicorn app.main:app --reload (from the backend/ folder)."""

import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import content
from .ai import fluency, llm, rubric, stt
from .config import CELPIP_IMAGES_DIR, FRONTEND_DIST
from .exams import EXAMS, EXAMS_BY_KEY, HANDLERS, TASKS_BY_KEY, exam_summary
from .scoring.text_metrics import text_metrics

app = FastAPI(title="AI English Examiner")


def _task(key: str) -> dict:
    if key not in TASKS_BY_KEY:
        raise HTTPException(404, f"Unknown task {key!r}")
    return TASKS_BY_KEY[key]


@app.get("/api/status")
def get_status():
    return {"llm": llm.status(), "stt": stt.status(), "photos": len(content.list_photos())}


@app.get("/api/exams")
def get_exams():
    return [exam_summary(exam) for exam in EXAMS]


@app.get("/api/exams/{key}")
def get_exam(key: str):
    if key not in EXAMS_BY_KEY:
        raise HTTPException(404, f"Unknown exam {key!r}")
    exam = EXAMS_BY_KEY[key]
    return {**exam, "tasks": [TASKS_BY_KEY[t["key"]] for t in exam.get("tasks", [])]}


@app.get("/api/tasks")
def get_tasks():
    return list(TASKS_BY_KEY.values())


@app.get("/api/items/{task}")
def get_item(task: str, level: str | None = None, exclude: str = ""):
    t = _task(task)
    if not t["available"]:
        raise HTTPException(404, f"{t['name']} is not available yet")
    seen = set(filter(None, exclude.split(",")))
    return HANDLERS[t["exam"]].get_item(t, level, seen)


@app.get("/api/photos/{name}")
def get_photo(name: str):
    return FileResponse(content.photo_path(name))


@app.get("/api/celpip/images/{name}")
def get_celpip_image(name: str):
    images = {p.name for p in CELPIP_IMAGES_DIR.glob("*.svg")}
    if name not in images:
        raise HTTPException(404, f"Unknown image {name!r}")
    return FileResponse(CELPIP_IMAGES_DIR / name, media_type="image/svg+xml")


class CheckRequest(BaseModel):
    item_id: str
    answers: dict[str, int | None] | list[bool | None] | list[str] | str


@app.post("/api/check/{task}")
def check(task: str, body: CheckRequest):
    t = _task(task)
    return HANDLERS[t["exam"]].check(t, body.item_id, body.answers)


class WritingFeedbackRequest(BaseModel):
    task: str
    item_id: str
    answer: str
    answer_part2: str | None = None
    choice: str | None = None


@app.post("/api/feedback/writing")
async def writing_feedback(body: WritingFeedbackRequest):
    t = _task(body.task)
    if t["kind"] != "writing":
        raise HTTPException(400, f"{body.task!r} is not a writing task")
    question, answer, metrics, photo = HANDLERS[t["exam"]].writing_question(t, body)
    return await run_in_threadpool(rubric.get_feedback, body.task, question, answer, metrics, photo)


@app.post("/api/transcribe")
async def transcribe(task: str = Form(...), audio: UploadFile = File(...)):
    if TASKS_BY_KEY.get(task, {}).get("kind") not in ("speaking", "conversation"):
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
    choice: str | None = None


@app.post("/api/feedback/speaking")
async def speaking_feedback(body: SpeakingFeedbackRequest):
    t = _task(body.task)
    if t["kind"] != "speaking":
        raise HTTPException(400, f"{body.task!r} is not a speaking task")
    question, photo = HANDLERS[t["exam"]].speaking_question(t, body)
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

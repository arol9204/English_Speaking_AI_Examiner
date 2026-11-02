import json

import pytest
from fastapi.testclient import TestClient

from app import content
from app.ai import llm
from app.exams.celpip.handlers import questions
from app.main import app

client = TestClient(app)

LISTENING = [f"celpip_listening_{n}" for n in range(1, 7)]
READING = [f"celpip_reading_{n}" for n in range(1, 5)]


@pytest.fixture
def fake_llm(monkeypatch):
    calls = []

    def fake_chat(prompt, schema, images=None):
        calls.append({"prompt": prompt, "schema": schema, "images": images})
        return {"overall_level": "8"}

    monkeypatch.setattr(llm, "chat_json", fake_chat)
    return calls


def _full_item(task_key, item_id):
    kind, part = task_key.split("_")[1:]
    return content.get_item(f"celpip/{kind}_part{part}", item_id)


def test_celpip_catalog():
    summary = next(e for e in client.get("/api/exams").json() if e["key"] == "celpip")
    assert summary["criteria_names"]["listenability"] == "Listenability"
    exam = client.get("/api/exams/celpip").json()
    assert exam["skills"] == ["Listening", "Reading", "Writing", "Speaking"]
    assert len(exam["tasks"]) == 20 and all(t["available"] for t in exam["tasks"])
    assert exam["scale"]["levels"] == [str(n) for n in range(1, 13)]


@pytest.mark.parametrize("task", LISTENING + READING)
def test_items_hide_answers_and_check_scores_them(task):
    item = client.get(f"/api/items/{task}").json()
    assert '"answer"' not in json.dumps(item) and '"explanation"' not in json.dumps(item)

    full = _full_item(task, item["id"])
    right = {q["id"]: q["answer"] for q in questions(full)}
    result = client.post(f"/api/check/{task}", json={"item_id": item["id"], "answers": right}).json()
    assert result["score"] == 1 and result["correct"] == result["total"] == len(right)
    assert all(r["explanation"] for r in result["results"])

    empty = client.post(f"/api/check/{task}", json={"item_id": item["id"], "answers": {}}).json()
    assert empty["score"] == 0 and all(r["chosen"] is None for r in empty["results"])


def test_check_rejects_answers_in_the_wrong_shape():
    item = client.get("/api/items/celpip_reading_1").json()
    response = client.post("/api/check/celpip_reading_1", json={"item_id": item["id"], "answers": "B"})
    assert response.status_code == 400


def test_writing_email_feedback_uses_celpip_scale(fake_llm):
    item = client.get("/api/items/celpip_writing_1").json()
    assert len(item["bullets"]) == 3
    result = client.post("/api/feedback/writing", json={
        "task": "celpip_writing_1", "item_id": item["id"], "answer": "Dear Sir, my laptop arrived broken."}).json()
    assert result["scale"]["levels"][-1] == "12"
    assert result["criteria_names"]["readability"] == "Readability"
    schema = fake_llm[0]["schema"]
    assert schema["properties"]["overall_level"]["enum"] == [str(n) for n in range(1, 13)]
    assert set(schema["properties"]["criteria"]["required"]) == {
        "content_coherence", "vocabulary", "readability", "task_fulfillment"}
    prompt = fake_llm[0]["prompt"]
    assert "CELPIP-General" in prompt and "150-200 words" in prompt and "27 minutes" in prompt
    assert item["bullets"][0] in prompt


def test_survey_feedback_names_the_choice(fake_llm):
    item = client.get("/api/items/celpip_writing_2").json()
    body = {"task": "celpip_writing_2", "item_id": item["id"], "answer": "I prefer the first one."}
    client.post("/api/feedback/writing", json={**body, "choice": "B"})
    assert "chose Option B" in fake_llm[0]["prompt"]
    client.post("/api/feedback/writing", json=body)
    assert "work it out from the answer" in fake_llm[1]["prompt"]
    assert client.post("/api/feedback/writing", json={**body, "choice": "Z"}).status_code == 400


def test_comparing_and_persuading_item_and_feedback(fake_llm):
    item = client.get("/api/items/celpip_speaking_5").json()
    assert len(item["options"]) == 2 and item["other"]["title"]
    body = {"task": "celpip_speaking_5", "item_id": item["id"], "transcript": "I think we should pick it.",
            "fluency": {"words_per_minute": 110}}
    client.post("/api/feedback/speaking", json={**body, "choice": "A"})
    prompt = fake_llm[0]["prompt"]
    assert item["options"][0]["title"] in prompt and item["other"]["title"] in prompt
    assert "listenability" in fake_llm[0]["schema"]["properties"]["criteria"]["required"]


def test_difficult_situation_feedback_names_the_choice(fake_llm):
    item = client.get("/api/items/celpip_speaking_6").json()
    client.post("/api/feedback/speaking", json={
        "task": "celpip_speaking_6", "item_id": item["id"], "transcript": "Hi, I am sorry.",
        "fluency": {}, "choice": "B"})
    assert "chose Option B" in fake_llm[0]["prompt"]


def test_unusual_situation_serves_a_drawing_and_describes_it_to_the_examiner(fake_llm):
    item = client.get("/api/items/celpip_speaking_8").json()
    assert "description" not in item
    image = client.get(item["image_url"])
    assert image.status_code == 200 and image.headers["content-type"].startswith("image/svg+xml")
    client.post("/api/feedback/speaking", json={
        "task": "celpip_speaking_8", "item_id": item["id"], "transcript": "It is a strange thing.",
        "fluency": {}})
    full = content.get_item("celpip/speaking_task8", item["id"])
    assert full["description"] in fake_llm[0]["prompt"]
    assert fake_llm[0]["images"] is None


def test_unknown_drawing_is_not_served():
    assert client.get("/api/celpip/images/nope.svg").status_code == 404
    assert client.get("/api/celpip/images/..%2F..%2Fwords.json").status_code == 404


def test_scene_tasks_use_the_users_photos(fake_llm, monkeypatch, tmp_path):
    (tmp_path / "park.jpg").write_bytes(b"\xff\xd8fake")
    monkeypatch.setattr(content, "PHOTOS_DIR", tmp_path)
    item = client.get("/api/items/celpip_speaking_3").json()
    assert item == {"id": "park.jpg", "url": "/api/photos/park.jpg"}
    client.post("/api/feedback/speaking", json={
        "task": "celpip_speaking_3", "item_id": "park.jpg", "transcript": "People are walking.",
        "fluency": {}})
    assert fake_llm[0]["images"] and "cannot see the picture" in fake_llm[0]["prompt"]


def test_simple_speaking_prompts(fake_llm):
    for n in (1, 2, 7):
        item = client.get(f"/api/items/celpip_speaking_{n}").json()
        assert item["prompt"]
    item = client.get("/api/items/celpip_speaking_7").json()
    client.post("/api/feedback/speaking", json={
        "task": "celpip_speaking_7", "item_id": item["id"], "transcript": "I believe so.", "fluency": {}})
    assert item["prompt"] in fake_llm[0]["prompt"] and "90 seconds" in fake_llm[0]["prompt"]


def test_transcribe_accepts_celpip_speaking_tasks(monkeypatch):
    from app.ai import stt

    monkeypatch.setattr(stt, "installed", lambda: True)
    monkeypatch.setattr(stt, "transcribe", lambda path: {"text": "Hello", "duration": 2, "words": [
        {"word": "Hello", "start": 0.2, "end": 0.6, "probability": 0.9}]})
    response = client.post("/api/transcribe", data={"task": "celpip_speaking_1"},
                           files={"audio": ("a.webm", b"x", "audio/webm")})
    assert response.status_code == 200
    assert client.post("/api/transcribe", data={"task": "celpip_reading_1"},
                       files={"audio": ("a.webm", b"x", "audio/webm")}).status_code == 400

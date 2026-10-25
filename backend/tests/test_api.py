from fastapi.testclient import TestClient

from app.ai import llm
from app.main import app

client = TestClient(app)


def test_tasks_catalog():
    tasks = client.get("/api/tasks").json()
    assert len(tasks) == 13
    assert {t["key"] for t in tasks if t["available"]} >= {"read_and_select", "listen_and_type"}


def test_read_and_select_round_trip():
    item = client.get("/api/items/read_and_select?level=easy").json()
    answers = [True] * len(item["words"])
    result = client.post("/api/check/read_and_select",
                         json={"item_id": item["id"], "answers": answers}).json()
    assert 0 < result["score"] < 1
    assert [r["word"] for r in result["results"]] == item["words"]


def test_fill_in_the_blanks_round_trip():
    item = client.get("/api/items/fill_in_the_blanks?level=easy").json()
    assert "answer" not in item
    wrong = client.post("/api/check/fill_in_the_blanks",
                        json={"item_id": item["id"], "answers": "zzz"}).json()
    assert not wrong["correct"]
    right = client.post("/api/check/fill_in_the_blanks",
                        json={"item_id": item["id"], "answers": wrong["answer"].upper()}).json()
    assert right["correct"]


def test_read_and_complete_partial_credit():
    item = client.get("/api/items/read_and_complete").json()
    gaps = [s for s in item["segments"] if s["type"] == "gap"]
    result = client.post("/api/check/read_and_complete",
                         json={"item_id": item["id"], "answers": ["x"] * len(gaps)}).json()
    first = result["results"][0]["answer"]
    result = client.post("/api/check/read_and_complete",
                         json={"item_id": item["id"], "answers": [first]}).json()
    assert result["results"][0]["correct"] and 0 < result["score"] < 1


def test_listen_and_type():
    item = client.get("/api/items/listen_and_type").json()
    result = client.post("/api/check/listen_and_type",
                         json={"item_id": item["id"], "answers": item["text"]}).json()
    assert result["score"] == 1


def test_writing_feedback_without_llm_still_returns_metrics(monkeypatch):
    def offline(*args, **kwargs):
        raise llm.LLMUnavailable("Ollama is not running")

    monkeypatch.setattr(llm, "chat_json", offline)
    item = client.get("/api/items/interactive_writing").json()
    result = client.post("/api/feedback/writing", json={
        "task": "interactive_writing", "item_id": item["id"],
        "answer": "I want to learn to cook.", "answer_part2": "It is hard."}).json()
    assert result["ai"] is None and "not running" in result["ai_error"]
    assert result["metrics"]["part1"]["word_count"] == 6
    assert item["follow_up"] in result["claude_prompt"]


def test_speaking_feedback_uses_llm(monkeypatch):
    captured = {}

    def fake_chat(prompt, schema, images=None):
        captured["prompt"], captured["schema"] = prompt, schema
        return {"overall_level": "B1"}

    monkeypatch.setattr(llm, "chat_json", fake_chat)
    item = client.get("/api/items/read_then_speak").json()
    result = client.post("/api/feedback/speaking", json={
        "task": "read_then_speak", "item_id": item["id"],
        "transcript": "I enjoyed a film", "fluency": {"words_per_minute": 90}}).json()
    assert result["ai"] == {"overall_level": "B1"}
    assert "pronunciation" in captured["schema"]["properties"]["criteria"]["required"]
    assert "words_per_minute" in captured["prompt"]


def test_photo_tasks_explain_missing_photos():
    response = client.get("/api/items/write_about_the_photo")
    assert response.status_code in (200, 404)


def test_photo_path_traversal_blocked():
    assert client.get("/api/photos/..%2Fwords.json").status_code == 404


def test_transcribe_adds_fluency(monkeypatch):
    from app.ai import stt

    monkeypatch.setattr(stt, "installed", lambda: True)
    monkeypatch.setattr(stt, "transcribe", lambda path: {
        "text": "Hello there", "duration": 3.0,
        "words": [{"word": "Hello", "start": 0.5, "end": 0.9, "probability": 0.95},
                  {"word": "there", "start": 1.0, "end": 1.4, "probability": 0.9}]})
    response = client.post("/api/transcribe", data={"task": "read_then_speak"},
                           files={"audio": ("answer.webm", b"fake", "audio/webm")})
    assert response.status_code == 200
    assert response.json()["fluency"]["word_count"] == 2


def test_transcribe_rejects_writing_task():
    response = client.post("/api/transcribe", data={"task": "writing_sample"},
                           files={"audio": ("a.webm", b"x", "audio/webm")})
    assert response.status_code == 400


def test_interactive_speaking_item_has_two_topics_and_6_to_8_questions():
    for _ in range(10):
        item = client.get("/api/items/interactive_speaking").json()
        assert len(item["topics"]) == 2
        assert len({t["id"] for t in item["topics"]}) == 2
        total = sum(len(t["questions"]) for t in item["topics"])
        assert 6 <= total <= 8
        assert all({"easy", "hard"} <= q.keys() for t in item["topics"] for q in t["questions"])


def test_transcribe_reports_answer_strength(monkeypatch):
    from app.ai import stt

    words = [{"word": f"w{i}", "start": i * 0.5, "end": i * 0.5 + 0.4, "probability": 0.9}
             for i in range(50)]
    monkeypatch.setattr(stt, "installed", lambda: True)
    monkeypatch.setattr(stt, "transcribe", lambda path: {"text": "", "duration": 30, "words": words})
    response = client.post("/api/transcribe", data={"task": "interactive_speaking"},
                           files={"audio": ("a.webm", b"x", "audio/webm")})
    assert response.json()["strength"] == "strong"


def test_conversation_feedback_asks_for_per_answer_comments(monkeypatch):
    captured = {}

    def fake_chat(prompt, schema, images=None):
        captured["prompt"], captured["schema"] = prompt, schema
        return {"overall_level": "B1", "per_answer": ["ok", "short"]}

    monkeypatch.setattr(llm, "chat_json", fake_chat)
    result = client.post("/api/feedback/interactive_speaking", json={"turns": [
        {"question": "Where are you from?", "transcript": "I am from Lima.", "fluency": {}},
        {"question": "Do you like it?", "transcript": "", "fluency": {}},
    ]}).json()
    assert result["ai"]["per_answer"] == ["ok", "short"]
    assert "per_answer" in captured["schema"]["required"]
    assert "Answer 2: (no answer)" in captured["prompt"]

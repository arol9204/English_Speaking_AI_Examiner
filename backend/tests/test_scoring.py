from app.ai.fluency import fluency_metrics
from app.scoring.dictation import score_dictation
from app.scoring.text_metrics import text_metrics


def test_dictation_perfect():
    result = score_dictation("The bus was full this morning.", "The bus was full this morning.")
    assert result["score"] == 1 and result["exact_match"]


def test_dictation_ignores_case_and_punctuation_for_word_score():
    result = score_dictation("The bus was full this morning.", "the bus was full this morning")
    assert result["score"] == 1 and not result["exact_match"]


def test_dictation_reports_each_error():
    result = score_dictation("I forgot my keys at home.", "I forget my keys home")
    assert result["errors"] == 2
    ops = [op["op"] for op in result["ops"]]
    assert ops == ["equal", "sub", "equal", "equal", "del", "equal"]


def test_text_metrics():
    m = text_metrics("I love cities. They are vibrant and cosmopolitan!")
    assert m["word_count"] == 8 and m["sentence_count"] == 2
    assert "cosmopolitan" in m["advanced_words"]


def test_fluency_metrics():
    words = [
        {"word": "Well,", "start": 1.0, "end": 1.3, "probability": 0.9},
        {"word": "um,", "start": 1.4, "end": 1.6, "probability": 0.9},
        {"word": "I", "start": 3.5, "end": 3.6, "probability": 0.9},
        {"word": "think", "start": 3.7, "end": 4.0, "probability": 0.3},
    ]
    m = fluency_metrics(words, 90)
    assert m["word_count"] == 3 and m["fillers"] == 1
    assert m["long_pauses"] == 1 and m["unclear_words"] == ["think"]
    assert m["silence_before_start"] == 1.0


def test_answer_strength():
    from app.ai.fluency import answer_strength

    assert answer_strength({"word_count": 60, "words_per_minute": 120}) == "strong"
    assert answer_strength({"word_count": 60, "words_per_minute": 60}) == "ok"
    assert answer_strength({"word_count": 5, "words_per_minute": 100}) == "weak"

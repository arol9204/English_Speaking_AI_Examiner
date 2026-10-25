"""Fluency and pronunciation signals computed from Whisper word timings.

These are approximations. Pronunciation is estimated from how confident the speech
recognizer was about each word: words it struggled with are often unclear or mispronounced.
"""

import re

FILLERS = re.compile(r"^(um+|uh+|uhm+|erm*|hmm+|ah+|eh+|mm+)$", re.IGNORECASE)
PAUSE_SECONDS = 0.6
LONG_PAUSE_SECONDS = 1.5
LOW_CONFIDENCE = 0.5


def fluency_metrics(words: list[dict], allowed_seconds: float) -> dict:
    tokens = [{**w, "clean": re.sub(r"[^\w']", "", w["word"])} for w in words]
    tokens = [t for t in tokens if t["clean"]]
    if not tokens:
        return {"word_count": 0, "speaking_seconds": 0, "words_per_minute": 0, "pauses": 0,
                "long_pauses": 0, "fillers": 0, "filler_words": [], "silence_before_start": 0,
                "time_used_ratio": 0, "unclear_words": []}
    fillers = [t["clean"] for t in tokens if FILLERS.match(t["clean"])]
    content = [t for t in tokens if not FILLERS.match(t["clean"])]
    gaps = [b["start"] - a["end"] for a, b in zip(tokens, tokens[1:])]
    speaking = max(tokens[-1]["end"] - tokens[0]["start"], 0.1)
    return {
        "word_count": len(content),
        "speaking_seconds": round(speaking, 1),
        "words_per_minute": round(len(content) / speaking * 60),
        "pauses": sum(g >= PAUSE_SECONDS for g in gaps),
        "long_pauses": sum(g >= LONG_PAUSE_SECONDS for g in gaps),
        "fillers": len(fillers),
        "filler_words": fillers,
        "silence_before_start": round(tokens[0]["start"], 1),
        "time_used_ratio": round(min(tokens[-1]["end"] / allowed_seconds, 1), 2)
        if allowed_seconds else 0,
        "unclear_words": [t["clean"] for t in content if t["probability"] < LOW_CONFIDENCE],
    }


def answer_strength(metrics: dict) -> str:
    """Rough signal used to make Interactive Speaking adaptive: 'strong', 'ok' or 'weak'.

    The real test makes questions harder after good answers and easier after weak ones.
    Here a long, steady answer counts as strong and a very short one as weak.
    """
    if metrics["word_count"] >= 40 and metrics["words_per_minute"] >= 90:
        return "strong"
    if metrics["word_count"] < 15:
        return "weak"
    return "ok"

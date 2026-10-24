"""Local speech-to-text with faster-whisper, including word timings for fluency measures."""

from functools import lru_cache

from ..config import WHISPER_DEVICE, WHISPER_MODEL

# Whisper tends to drop hesitations. Starting it with a disfluent prompt makes it keep
# "um", "uh" and similar fillers, which we need to measure fluency.
DISFLUENT_PROMPT = "Umm, let me think, like, hmm... Okay, so, uh, I think that, um, well..."


class STTUnavailable(Exception):
    pass


def installed() -> bool:
    try:
        import faster_whisper  # noqa: F401
    except ImportError:
        return False
    return True


def status() -> dict:
    ok = installed()
    return {
        "available": ok,
        "model": WHISPER_MODEL,
        "reason": None if ok else "Run: pip install faster-whisper",
    }


@lru_cache
def _model():
    if not installed():
        raise STTUnavailable("faster-whisper is not installed. Run: pip install faster-whisper")
    from faster_whisper import WhisperModel

    return WhisperModel(WHISPER_MODEL, device=WHISPER_DEVICE, compute_type="int8")


def transcribe(audio_path: str) -> dict:
    segments, info = _model().transcribe(
        audio_path,
        language="en",
        word_timestamps=True,
        initial_prompt=DISFLUENT_PROMPT,
        vad_filter=False,
    )
    words = []
    for segment in segments:
        for w in segment.words or []:
            words.append({"word": w.word.strip(), "start": round(w.start, 2),
                          "end": round(w.end, 2), "probability": round(w.probability, 2)})
    return {
        "text": " ".join(w["word"] for w in words),
        "words": words,
        "duration": round(info.duration, 2),
    }

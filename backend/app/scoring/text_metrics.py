"""Free, model-free statistics about a written or spoken answer."""

import re

from wordfreq import zipf_frequency


def text_metrics(text: str) -> dict:
    words = re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", text)
    lower = [w.lower() for w in words]
    sentences = [s for s in re.split(r"[.!?]+", text) if s.strip()]
    # Words that are rare in everyday English are a rough signal of a wider vocabulary.
    advanced = sorted({w for w in lower if len(w) > 3 and zipf_frequency(w, "en") < 3.8})
    return {
        "word_count": len(words),
        "sentence_count": len(sentences),
        "avg_sentence_length": round(len(words) / len(sentences), 1) if sentences else 0,
        "unique_word_ratio": round(len(set(lower)) / len(lower), 2) if lower else 0,
        "advanced_words": advanced,
    }

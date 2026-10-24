"""C-test gaps for Fill in the Blanks and Read and Complete.

Rules from the DET Question Guide: the second half of each word is missing, the title and the
first and last sentences stay whole, gaps are never next to each other, and proper nouns and
acronyms are never gapped.
"""

import re

SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")
WORD = re.compile(r"^([^A-Za-z]*)([A-Za-z]+)([^A-Za-z]*)$")


def split_word(word: str) -> tuple[str, str]:
    """Return (shown prefix, missing suffix). For odd lengths the bigger half is removed."""
    keep = len(word) // 2
    return word[:keep], word[keep:]


def make_blank(sentence: str) -> dict:
    """Turn 'I drink [coffee] daily.' into a Fill in the Blanks item."""
    match = re.search(r"\[([A-Za-z]+)\]", sentence)
    if not match:
        raise ValueError(f"Sentence has no [answer]: {sentence!r}")
    prefix, missing = split_word(match.group(1))
    return {
        "before": sentence[: match.start()],
        "prefix": prefix,
        "missing_length": len(missing),
        "after": sentence[match.end():],
        "answer": missing,
    }


def _gappable(core: str, is_sentence_start: bool) -> bool:
    if len(core) < 2:
        return False
    if core.isupper() and len(core) > 1:  # acronym
        return False
    if core[0].isupper() and not is_sentence_start:  # proper noun
        return False
    return True


def make_c_test(passage: str) -> dict:
    """Split a passage into text and gap segments. Answers are returned separately."""
    sentences = SENTENCE_SPLIT.split(passage.strip())
    segments: list[dict] = []
    answers: list[str] = []

    def add_text(text: str):
        if segments and segments[-1]["type"] == "text":
            segments[-1]["text"] += text
        else:
            segments.append({"type": "text", "text": text})

    word_counter = 0
    for s_index, sentence in enumerate(sentences):
        separator = " " if s_index < len(sentences) - 1 else ""
        whole = s_index == 0 or s_index == len(sentences) - 1
        if whole:
            add_text(sentence + separator)
            continue
        tokens = sentence.split(" ")
        for t_index, token in enumerate(tokens):
            trailing = " " if t_index < len(tokens) - 1 else separator
            word_counter += 1
            match = WORD.match(token)
            # Every second word counts as a candidate, starting with the second word.
            if word_counter % 2 == 0 and match and _gappable(match.group(2), t_index == 0):
                lead, core, tail = match.groups()
                prefix, missing = split_word(core)
                add_text(lead)
                segments.append({"type": "gap", "index": len(answers), "prefix": prefix,
                                 "missing_length": len(missing)})
                answers.append(missing)
                add_text(tail + trailing)
            else:
                add_text(token + trailing)
    return {"segments": segments, "answers": answers}

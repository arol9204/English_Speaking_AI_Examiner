"""Scoring for Listen and Type: word-level alignment against the reference sentence."""

import re


def normalize_words(text: str) -> list[str]:
    text = text.lower().replace("’", "'")
    return re.findall(r"[a-z0-9]+(?:'[a-z]+)?", text)


def align(ref: list[str], hyp: list[str]) -> list[dict]:
    """Levenshtein alignment returning equal/sub/del/ins operations, in order."""
    n, m = len(ref), len(hyp)
    cost = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        cost[i][0] = i
    for j in range(m + 1):
        cost[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            same = ref[i - 1] == hyp[j - 1]
            cost[i][j] = min(cost[i - 1][j - 1] + (0 if same else 1),
                             cost[i - 1][j] + 1, cost[i][j - 1] + 1)
    ops: list[dict] = []
    i, j = n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0 and cost[i][j] == cost[i - 1][j - 1] + (ref[i - 1] != hyp[j - 1]):
            ops.append({"op": "equal" if ref[i - 1] == hyp[j - 1] else "sub",
                        "ref": ref[i - 1], "hyp": hyp[j - 1]})
            i, j = i - 1, j - 1
        elif i > 0 and cost[i][j] == cost[i - 1][j] + 1:
            ops.append({"op": "del", "ref": ref[i - 1], "hyp": None})
            i -= 1
        else:
            ops.append({"op": "ins", "ref": None, "hyp": hyp[j - 1]})
            j -= 1
    return ops[::-1]


def score_dictation(reference: str, answer: str) -> dict:
    ref, hyp = normalize_words(reference), normalize_words(answer)
    ops = align(ref, hyp)
    errors = sum(op["op"] != "equal" for op in ops)
    word_score = max(0.0, 1 - errors / max(len(ref), 1))
    # The real test also checks punctuation and capitals, so report them separately.
    punctuation_ok = re.sub(r"\s+", " ", answer.strip()) == reference
    return {
        "score": round(word_score, 3),
        "errors": errors,
        "ops": ops,
        "exact_match": punctuation_ok,
        "reference": reference,
    }

import random

from app.content import items
from app.generators import c_test, read_and_select


def test_split_word_removes_bigger_half():
    assert c_test.split_word("coffee") == ("cof", "fee")
    assert c_test.split_word("tired") == ("ti", "red")
    assert c_test.split_word("to") == ("t", "o")


def test_make_blank():
    blank = c_test.make_blank("I drink [coffee] every day.")
    assert blank == {"before": "I drink ", "prefix": "cof", "missing_length": 3,
                     "after": " every day.", "answer": "fee"}


def _render(test):
    return "".join(s["text"] if s["type"] == "text" else s["prefix"] for s in test["segments"])


def test_c_test_follows_official_rules():
    passage = ("First sentence stays whole. The quick brown fox jumps over the lazy dog near London. "
               "Another sentence follows with several words in it. The last sentence stays whole too.")
    test = c_test.make_c_test(passage)
    gaps = [s for s in test["segments"] if s["type"] == "gap"]
    assert len(gaps) == len(test["answers"]) > 5
    text_before_gaps = test["segments"][0]["text"]
    assert text_before_gaps.startswith("First sentence stays whole. ")
    assert test["segments"][-1]["text"].endswith("The last sentence stays whole too.")
    # Gaps are never next to each other.
    for a, b in zip(test["segments"], test["segments"][1:]):
        assert not (a["type"] == "gap" and b["type"] == "gap")
    # Proper nouns are never gapped.
    assert "London" in _render(test)


def test_c_test_answers_rebuild_the_passage():
    for item in items("read_and_complete"):
        test = c_test.make_c_test(item["passage"])
        rebuilt = "".join(s["text"] if s["type"] == "text" else s["prefix"] + test["answers"][s["index"]]
                          for s in test["segments"])
        assert rebuilt == item["passage"]
        assert len(test["answers"]) >= 10


def test_every_fill_in_the_blank_item_parses():
    for item in items("fill_in_the_blanks"):
        assert c_test.make_blank(item["sentence"])["answer"]


def test_read_and_select_set_is_deterministic_and_mixed():
    first = read_and_select.make_set("medium", 42)
    assert first == read_and_select.make_set("medium", 42)
    assert len(first) == read_and_select.WORDS_PER_SET
    real = [w for w in first if w["real"]]
    assert 0 < len(real) < len(first)


def test_fake_words_are_not_real_words():
    fakes = read_and_select.fake_words(random.Random(1), 50)
    assert len(set(fakes)) == 50
    assert all(read_and_select.is_plausible_fake(w) for w in fakes)
    assert not read_and_select.is_plausible_fake("garden")
    assert not read_and_select.is_plausible_fake("ptoxital")

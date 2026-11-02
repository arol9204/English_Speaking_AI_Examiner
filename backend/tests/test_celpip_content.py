"""Checks that the CELPIP question bank matches the official structure and is well-formed."""

import re
from collections import Counter

import pytest

from app.config import CELPIP_IMAGES_DIR
from app.content import items
from app.exams.celpip.catalog import TASKS
from app.exams.celpip.handlers import questions

# Official question counts from the CELPIP Guidebook for Test Takers.
LISTENING_COUNTS = {1: 8, 2: 5, 3: 6, 4: 5, 5: 8, 6: 6}
READING_COUNTS = {1: 11, 2: 8, 3: 9, 4: 10}


def test_catalog_matches_guidebook():
    by_skill = Counter(t["subscore"] for t in TASKS)
    assert by_skill == {"Listening": 6, "Reading": 4, "Writing": 2, "Speaking": 8}
    for task in TASKS:
        if task["subscore"] == "Listening":
            assert task["question_count"] == LISTENING_COUNTS[int(task["key"][-1])]
        if task["subscore"] == "Reading":
            assert task["question_count"] == READING_COUNTS[int(task["key"][-1])]
    assert sum(LISTENING_COUNTS.values()) == 38 and sum(READING_COUNTS.values()) == 38


@pytest.mark.parametrize("part,count", LISTENING_COUNTS.items())
def test_listening_sets(part, count):
    sets = items(f"celpip/listening_part{part}")
    assert len(sets) >= 3
    for item in sets:
        qs = questions(item)
        assert len(qs) == count, item["id"]
        if part == 1:
            assert [len(s["questions"]) for s in item["sections"]] == [3, 3, 2]
        else:
            assert len(item["sections"]) == 1
        for section in item["sections"]:
            assert section["lines"]
            for line in section["lines"]:
                assert line["speaker"] in item["speakers"], item["id"]
                assert line["text"].strip()
        _check_choice_questions(item["id"], qs)


@pytest.mark.parametrize("part,count", READING_COUNTS.items())
def test_reading_sets(part, count):
    sets = items(f"celpip/reading_part{part}")
    assert len(sets) >= 3
    for item in sets:
        qs = questions(item)
        assert len(qs) == count, item["id"]
        for task in item["tasks"]:
            if task["type"] == "cloze":
                blanks = re.findall(r"\{\{(\w+)\}\}", task["text"])
                assert blanks == [q["id"] for q in task["questions"]], item["id"]
            if task["type"] == "match":
                assert task["options"] == ["A", "B", "C", "D", "E"]
                for q in task["questions"]:
                    assert 0 <= q["answer"] < len(task["options"]), (item["id"], q["id"])
                    assert q["explanation"]
        _check_choice_questions(item["id"], [q for t in item["tasks"] if t["type"] != "match"
                                             for q in t["questions"]])
        if item["passage"]["type"] == "diagram":
            width = len(item["passage"]["columns"])
            assert all(len(row) == width for row in item["passage"]["rows"])


def _check_choice_questions(item_id, qs):
    ids = [q["id"] for q in qs]
    assert len(set(ids)) == len(ids), item_id
    for q in qs:
        assert len(q["options"]) == 4, (item_id, q["id"])
        assert len(set(q["options"])) == 4, (item_id, q["id"])
        assert 0 <= q["answer"] < 4, (item_id, q["id"])
        assert q["explanation"], (item_id, q["id"])
    # The right answer should not always sit in the same position.
    if len(qs) >= 5:
        assert len({q["answer"] for q in qs}) >= 3, item_id


def test_writing_prompts():
    for item in items("celpip/writing_task1"):
        assert len(item["bullets"]) == 3
    for item in items("celpip/writing_task2"):
        assert [o["key"] for o in item["options"]] == ["A", "B"]


def test_speaking_prompts():
    for n in (1, 2, 7):
        assert len(items(f"celpip/speaking_task{n}")) >= 8
    for item in items("celpip/speaking_task5"):
        assert [o["key"] for o in item["options"]] == ["A", "B"]
        assert item["other"]["details"] and item["other_person"]
    for item in items("celpip/speaking_task6"):
        assert [c["key"] for c in item["choices"]] == ["A", "B"]
    for item in items("celpip/speaking_task8"):
        assert (CELPIP_IMAGES_DIR / item["image"]).is_file()
        assert len(item["description"]) > 40


def test_item_ids_are_unique_across_the_bank():
    names = ([f"celpip/listening_part{n}" for n in LISTENING_COUNTS]
             + [f"celpip/reading_part{n}" for n in READING_COUNTS]
             + ["celpip/writing_task1", "celpip/writing_task2"]
             + [f"celpip/speaking_task{n}" for n in (1, 2, 5, 6, 7, 8)])
    ids = [item["id"] for name in names for item in items(name)]
    assert len(ids) == len(set(ids))

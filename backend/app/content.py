"""Loads the question bank from the JSON files in content/."""

import base64
import json
import random
from functools import lru_cache
from pathlib import Path

from fastapi import HTTPException

from .config import CONTENT_DIR, PHOTOS_DIR

LEVELS = ("easy", "medium", "hard")
PHOTO_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


@lru_cache
def load(name: str) -> dict:
    with open(CONTENT_DIR / f"{name}.json", encoding="utf-8") as f:
        return json.load(f)


def items(name: str) -> list[dict]:
    return load(name)["items"]


def get_item(name: str, item_id: str) -> dict:
    for item in items(name):
        if item["id"] == item_id:
            return item
    raise HTTPException(404, f"Unknown item {item_id!r} in {name}")


def random_item(name: str, level: str | None = None, exclude: set[str] = frozenset()) -> dict:
    pool = [i for i in items(name) if (level is None or i.get("level") == level)]
    fresh = [i for i in pool if i["id"] not in exclude]
    if not pool:
        raise HTTPException(404, f"No {name} items for level {level!r}")
    return random.choice(fresh or pool)


def list_photos() -> list[str]:
    if not PHOTOS_DIR.is_dir():
        return []
    return sorted(p.name for p in PHOTOS_DIR.iterdir() if p.suffix.lower() in PHOTO_EXTENSIONS)


def photo_path(name: str) -> Path:
    if name not in list_photos():
        raise HTTPException(404, f"Unknown photo {name!r}")
    return PHOTOS_DIR / name


def photo_b64(name: str) -> str:
    return base64.b64encode(photo_path(name).read_bytes()).decode()


def random_photo(seen: set[str] = frozenset()) -> dict:
    photos = list_photos()
    if not photos:
        raise HTTPException(404, "No photos yet. Add .jpg/.png files to content/photos/.")
    name = random.choice([p for p in photos if p not in seen] or photos)
    return {"id": name, "url": f"/api/photos/{name}"}

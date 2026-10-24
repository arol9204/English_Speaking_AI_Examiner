"""Minimal client for a local Ollama server (free, runs on your computer)."""

import json

import httpx

from ..config import OLLAMA_MODEL, OLLAMA_TIMEOUT, OLLAMA_URL


class LLMUnavailable(Exception):
    pass


def status() -> dict:
    """Is Ollama running, and is the configured model downloaded?"""
    try:
        response = httpx.get(f"{OLLAMA_URL}/api/tags", timeout=2)
        response.raise_for_status()
    except httpx.HTTPError:
        return {"available": False, "model": OLLAMA_MODEL, "reason": "Ollama is not running"}
    names = {m["name"] for m in response.json().get("models", [])}
    installed = OLLAMA_MODEL in names or f"{OLLAMA_MODEL}:latest" in names
    return {
        "available": installed,
        "model": OLLAMA_MODEL,
        "reason": None if installed else f"Run: ollama pull {OLLAMA_MODEL}",
    }


def chat_json(prompt: str, schema: dict, images: list[str] | None = None) -> dict:
    """Send one prompt and get back JSON matching `schema`. Images are base64 strings."""
    message = {"role": "user", "content": prompt}
    if images:
        message["images"] = images
    try:
        response = httpx.post(
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": OLLAMA_MODEL,
                "messages": [message],
                "stream": False,
                "format": schema,
                "options": {"temperature": 0.2},
            },
            timeout=OLLAMA_TIMEOUT,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise LLMUnavailable(str(exc)) from exc
    content = response.json()["message"]["content"]
    try:
        return json.loads(content)
    except json.JSONDecodeError as exc:
        raise LLMUnavailable(f"Model returned invalid JSON: {content[:200]}") from exc

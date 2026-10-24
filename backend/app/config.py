"""App settings, read from environment variables so nothing needs editing in code."""

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

CONTENT_DIR = Path(os.environ.get("DET_CONTENT_DIR", REPO_ROOT / "content"))
PHOTOS_DIR = CONTENT_DIR / "photos"
FRONTEND_DIST = REPO_ROOT / "frontend" / "dist"

# Local LLM served by Ollama (https://ollama.com). gemma3 models can also read images,
# which the photo tasks need. Use gemma3:12b if your computer has 16 GB+ of RAM / a GPU.
OLLAMA_URL = os.environ.get("DET_OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("DET_OLLAMA_MODEL", "gemma3:4b")
OLLAMA_TIMEOUT = float(os.environ.get("DET_OLLAMA_TIMEOUT", "300"))

# Local speech-to-text (faster-whisper). "small" is a good accuracy/speed balance on a CPU;
# "base" is faster, "medium" is more accurate.
WHISPER_MODEL = os.environ.get("DET_WHISPER_MODEL", "small")
WHISPER_DEVICE = os.environ.get("DET_WHISPER_DEVICE", "auto")

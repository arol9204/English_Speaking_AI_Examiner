# DET Practice: an AI examiner for the Duolingo English Test

A free app that runs on your own computer, in your browser, to practice every question type of
the Duolingo English Test (DET), with timers, automatic scoring and AI feedback.

Not affiliated with Duolingo. Question formats, timings and grading criteria follow the
public **DET Question Guide (2026)**.

## What works now

| Skill | Question type | Scoring |
|---|---|---|
| Reading | Read and Select | Automatic (real vs. generated fake words) |
| Reading | Fill in the Blanks | Automatic |
| Reading | Read and Complete | Automatic, word by word |
| Listening | Listen and Type | Automatic, word by word, with a diff |
| Writing | Write About the Photo | AI feedback* |
| Writing | Interactive Writing (2 parts) | AI feedback* |
| Writing | Writing Sample | AI feedback* |
| Speaking | Speak About the Photo | Speech-to-text + fluency measures + AI feedback* |
| Speaking | Read, Then Speak | Speech-to-text + fluency measures + AI feedback* |
| Speaking | Speaking Sample | Speech-to-text + fluency measures + AI feedback* |

Coming next: Interactive Reading, Interactive Listening, Interactive Speaking, and a full mock test.

\* AI feedback rates each official criterion (content, coherence, grammar, lexis, plus fluency
and pronunciation for speaking) on the CEFR scale, lists corrections, and writes an improved
answer. It runs on a **free local model** through Ollama. Every answer also has a
**Copy for Claude** button: paste it into a chat at claude.ai for a second opinion.

## Set up (Windows, macOS or Linux)

You need [Python 3.10+](https://www.python.org/downloads/) and [Node.js 18+](https://nodejs.org).
Everything is free.

```bash
# 1. Python packages (from the project folder)
python -m venv .venv
.venv\Scripts\activate          # Windows  (macOS/Linux: source .venv/bin/activate)
pip install -r backend/requirements.txt

# 2. Start the app: it builds the web page the first time and opens your browser
python run.py
```

Use **Chrome or Edge** (they have the best built-in voices for the listening tasks).

### Turn on AI feedback (optional, free)

1. Install [Ollama](https://ollama.com/download).
2. Download a model: `ollama pull gemma3:4b` (about 3 GB; works on most laptops).
   With 16 GB+ of RAM or a graphics card, `gemma3:12b` gives better feedback:
   `ollama pull gemma3:12b`, then set `DET_OLLAMA_MODEL=gemma3:12b` before `python run.py`.
3. Keep Ollama running. The status bar on the home page turns green.

### Speaking tasks

`faster-whisper` (installed with the requirements) turns your speech into text on your computer.
The first recording downloads the Whisper model (~500 MB), so the first one is slow.
Set `DET_WHISPER_MODEL=base` for a faster but less accurate model.

### Photo tasks

Add your own photos to [`content/photos/`](content/photos/README.md).

## Project layout

```
backend/        Python API (FastAPI): question generators, scoring, local AI
  app/tasks.py    Catalog of all 13 question types with official timings
  app/generators/ Fake words (Read and Select) and C-test gaps (Read and Complete)
  app/scoring/    Dictation scoring and text statistics
  app/ai/         Ollama client, Whisper speech-to-text, fluency measures, grading rubric
  tests/          pytest tests
frontend/       React + TypeScript web page (Vite)
content/        Question bank (JSON) — edit or add questions here
docs/           Research notes on the DET
run.py          One-command launcher
```

## Development

```bash
pip install -r backend/requirements-dev.txt
cd backend && python -m pytest          # backend tests
uvicorn app.main:app --reload            # API on :8000 (run inside backend/)
cd frontend && npm install && npm run dev  # web page on :5173 with live reload
```

`English_Speaking_AI_examiner.ipynb` is the original Colab prototype (Whisper + LLM feedback
in Gradio) that this app grew from.

## License

GPL-3.0, see [LICENSE.txt](LICENSE.txt).

# AI English Examiner

A free app that runs on your own computer, in your browser, to practise international English
tests. Every question type is timed like the real test. Reading and listening are scored
instantly; writing and speaking are graded by a free AI examiner that runs on your computer.

Not affiliated with Duolingo or with Paragon Testing Enterprises (CELPIP). Question formats,
timings and grading criteria follow the **DET Question Guide (2026)** and the **CELPIP Guidebook
for Test Takers (2025)**.

## Tests

### Duolingo English Test (DET): 11 of 13 question types

| Skill | Question type | Scoring |
|---|---|---|
| Reading | Read and Select, Fill in the Blanks, Read and Complete | Automatic |
| Listening | Listen and Type | Automatic, word by word |
| Writing | Write About the Photo, Interactive Writing, Writing Sample | AI feedback* (CEFR levels) |
| Speaking | Speak About the Photo, Read Then Speak, Speaking Sample, Interactive Speaking | Speech-to-text, fluency measures and AI feedback* |

Still to come: Interactive Reading and Interactive Listening.

### CELPIP-General: all 20 parts

| Component | Parts | Scoring |
|---|---|---|
| Listening (6 parts, 38 questions) | Problem Solving, Daily Life Conversation, Information, News Item, Discussion, Viewpoints | Automatic, with transcripts and explanations |
| Reading (4 parts, 38 questions) | Correspondence, Apply a Diagram, Information, Viewpoints | Automatic, with explanations |
| Writing (2 tasks) | Writing an Email, Responding to Survey Questions | AI feedback* (CELPIP levels 1–12) |
| Speaking (8 tasks) | Giving Advice, Personal Experience, Describing a Scene, Making Predictions, Comparing and Persuading, Difficult Situation, Expressing Opinions, Unusual Situation | Speech-to-text, fluency measures and AI feedback* |

There are 3 sets for each listening and reading part and 6–10 prompts for each writing and
speaking task. Listening conversations are read aloud by the browser, with a different voice for
each speaker.

### Coming later

- A **Full test** mode for each test (whole test, real order and timing, score estimate).
- IELTS, TOEFL iBT and PTE Academic.

\* AI feedback rates each official criterion for that test, lists corrections, and writes an
improved answer. It runs on a **free local model** through Ollama. Every answer also has a
**Copy for Claude** button: paste it into a chat at claude.ai for a second opinion.

## Set up

**Windows users: follow the step-by-step [setup guide](docs/SETUP_GUIDE.md).** Short version:

You need [Python 3.12](https://www.python.org/downloads/) and [Node.js 18+](https://nodejs.org).
Everything is free.

```bash
# 1. Python packages (from the project folder)
py -3.12 -m venv .venv                      # macOS/Linux: python3.12 -m venv .venv
.venv\Scripts\python -m pip install -r backend/requirements.txt

# 2. Start the app: it builds the web page when needed and opens your browser
.venv\Scripts\python run.py                 # or double-click "Start English Examiner.bat"
```

Use **Chrome or Edge** (they have the best built-in voices for the listening tasks).

- **AI feedback (optional, free):** install [Ollama](https://ollama.com/download), then
  `ollama pull gemma3:4b`. With 16 GB+ of RAM or a graphics card, `gemma3:12b` gives better
  feedback: set `DET_OLLAMA_MODEL=gemma3:12b` before starting.
- **Speaking tasks:** `faster-whisper` (installed with the requirements) turns speech into text
  on your computer. The first recording downloads the model (~500 MB).
- **Photo tasks:** add your own photos to [`content/photos/`](content/photos/README.md).

## Project layout

```
backend/            Python API (FastAPI)
  app/exams/          One package per test: its catalog (timings, criteria, scale) and handlers
    det/                Duolingo English Test
    celpip/             CELPIP-General
  app/generators/     Fake words and C-test gaps for the DET
  app/scoring/        Dictation scoring and text statistics
  app/ai/             Ollama client, Whisper speech-to-text, fluency measures, grading rubric
  tests/              pytest tests, including checks that the question bank matches each test
frontend/           React + TypeScript web page (Vite)
content/            Question bank (JSON), one folder per test; edit or add questions here
  det/  celpip/  photos/
docs/               Research notes and the setup guide
run.py              One-command launcher
```

### Adding a test

Create `backend/app/exams/<test>/` with a `catalog.py` (an `EXAM` dict: skills, tasks with
timings, grading scale and criteria) and `handlers.py` (`get_item`, `check`,
`writing_question`, `speaking_question`), register it in `backend/app/exams/__init__.py`, and
put its questions in `content/<test>/`. Tasks reuse the existing screens through their `screen`
field.

## Development

```bash
pip install -r backend/requirements-dev.txt
cd backend && python -m pytest            # backend tests
uvicorn app.main:app --reload             # API on :8000 (run inside backend/)
cd frontend && npm install && npm run dev  # web page on :5173 with live reload
```

`English_Speaking_AI_examiner.ipynb` is the original Colab prototype (Whisper + LLM feedback
in Gradio) that this app grew from.

## License

GPL-3.0, see [LICENSE.txt](LICENSE.txt).

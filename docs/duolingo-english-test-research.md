# Duolingo English Test (DET): Research & Practice-Tool Brainstorm

> Status: updated with the official **DET Question Guide (2026)**, which overrides the third-party
> prep guides used in the first draft. Keep your copy of the PDF locally in `docs/` (it is
> copyrighted, so git ignores it).

---

## 1. The test at a glance

| Aspect | Detail (official guide) |
|---|---|
| Delivery | Online, any time, anywhere. Costs $70; results within two days |
| Adaptive | Most question types: questions get easier or harder based on your answers. The photo, Interactive Writing, Read Then Speak and Sample tasks are **not** adaptive |
| Score scale | Overall **10–160** |
| Subscores | **Listening, Speaking, Reading, Writing**, each 10–160. The overall score is their average, rounded up to the next score ending in 0 or 5 |
| Weighting | No fixed percentage per question type; because the test is adaptive, the score is not just the number of right answers |
| Writing criteria | Content, discourse coherence, grammar, lexis |
| Speaking criteria | Content, discourse coherence, fluency, grammar, lexis, pronunciation |
| July 2025 change | **Interactive Speaking** was added; Read Aloud and Listen, Then Speak were removed |

The older "integrated" subscores (Literacy, Comprehension, Conversation, Production) are no
longer mentioned in the 2026 guide.

---

## 2. All 13 question types (official timings)

| # | Type | What you do | Time | Count | Subscore | Adaptive |
|---|---|---|---|---|---|---|
| 1 | **Read and Select** | One word at a time: click Yes if it is a real English word, No if not | 5 s per word (no answer = wrong) | 15–18 | Reading | Yes |
| 2 | **Fill in the Blanks** | A sentence with one unfinished word (second half missing): type the ending. Spelling must be right | 20 s | 6–9 | Reading | Yes |
| 3 | **Read and Complete** | A paragraph with unfinished words: type the endings. Title, first and last sentences are whole; gaps are never next to each other; no proper nouns or acronyms | 3 min | 3–6 | Reading | Yes |
| 4 | **Listen and Type** | Type exactly what you hear, up to 3 plays. Partial credit; words, spelling and punctuation count | 1 min | 6–9 | Listening | Yes |
| 5 | **Interactive Reading** | One passage, six questions in order: Complete the Sentences (3–10 multiple-choice blanks), Complete the Passage (missing sentence), Highlight the Answer ×2 (partial credit), Identify the Idea, Title the Passage. At least one narrative and one expository text per test | 7 or 8 min per set (shared) | 2–3 sets | Reading | Yes |
| 6 | **Interactive Listening** | Campus scenario (student↔student, student↔professor). Listen and Complete (3–4 sentences, replay as often as you want, spelling not important), Listen and Respond (5–6 turns, each clip plays once, right answer shown after each), Summarize the Conversation (writing criteria) | 6:30 shared + 75 s summary | 2–3 sets | Listening (+ Writing for the summary) | Yes |
| 7 | **Write About the Photo** | Describe a real photo | 1 min | 3 | Writing | No |
| 8 | **Interactive Writing** | Part 1 answer, then a follow-up asking about an idea you didn't cover. Both scored together | 30 s prep + 5 min + 3 min | 1 | Writing | No |
| 9 | **Speak About the Photo** | Describe a real photo out loud. One recording only | 20 s prep + 90 s | 1 | Speaking | No |
| 10 | **Read, Then Speak** | Speak about an experience or opinion, with bullet points shown | 20 s prep + 90 s | 1 | Speaking | No |
| 11 | **Interactive Speaking** | A Duolingo character asks 3–4 questions on each of two topics. Each question plays once; the timer starts when it ends | 35 s per answer | 6–8 | Speaking | Yes |
| 12 | **Writing Sample** | Write about an experience or opinion. Sent to schools | 30 s prep + 5 min | 1 | Writing | No |
| 13 | **Speaking Sample** | Speak about an experience or opinion. Video sent to schools | 30 s prep + 3 min | 1 | Speaking | No |

---

## 3. Mapping to the four skills (what the tool must train)

- **Reading:** vocabulary recognition (real words versus pseudowords), spelling and morphology (C-test), sentence-level grammar, passage comprehension (main idea, titles, finding evidence).
- **Listening:** exact dictation (spelling and punctuation), following a conversation, choosing pragmatically correct replies, summarizing.
- **Writing:** fast descriptive writing (photos), argument or opinion writing in 5 minutes, follow-up elaboration, summary writing.
- **Speaking:** picture description, structured monologue, **spontaneous conversational answers** (Interactive Speaking), and fluency and pronunciation under time pressure.

---

## 4. Brainstorm: the practice tool

### 4.1 Core product idea
An **AI DET simulator** with three modes:

1. **Drill mode.** Practice one question type with real timers and get feedback right away.
2. **Full mock test.** A ~1-hour, adaptive, mixed-order test that copies the real flow, with an estimated 10–160 score and 8 subscores.
3. **Review & coach.** Score history, weakest question types, an error notebook (vocabulary, grammar, pronunciation), and spaced-repetition review.

### 4.2 How each question type could be built

| Type | Content generation | Auto-scoring |
|---|---|---|
| Read and Select | Real words from frequency lists sorted by CEFR level. Pseudowords from a character n-gram / phonotactic generator, then checked against a dictionary (LLMs are bad at making plausible non-words) | Exact. Penalize false positives |
| Fill in the Blanks | LLM writes the sentence, picks the target word, and shows its first letters | Exact match, plus an LLM check for acceptable alternatives |
| Read and Complete | LLM writes an academic paragraph. Apply the classic **C-test rule** in code: from the 2nd sentence on, cut the second half of every other word | Exact, per word |
| Interactive Reading | LLM writes a passage plus the six sub-items (MCQ distractors, missing sentence, highlight span, main idea, title) | Exact or span-overlap |
| Listen and Type | LLM writes graded sentences, **TTS** reads them in several accents and at several speeds | Word-level edit distance, with spelling and punctuation reported separately |
| Interactive Listening | LLM writes a campus dialogue script. Multi-voice TTS. Reply options include pragmatically wrong distractors | MCQ is exact. The summary is graded by an LLM rubric (key points covered, accuracy, language) |
| Write About the Photo / Speak About the Photo | Library of open-license photos (e.g. Unsplash or Pexels) or AI-generated scenes, with an LLM "reference description" for each | LLM rubric that checks the description against what the image actually shows (a vision model) |
| Interactive / Sample Writing | Bank of prompts plus LLM follow-up questions | LLM rubric: content, coherence, vocabulary, grammar, plus word count and lexical diversity |
| Read, Then Speak / Speaking Sample | Prompt bank | Whisper transcript → LLM rubric, plus acoustic fluency measures |
| **Interactive Speaking** | **AI examiner persona** that asks 6–8 related questions and adapts the follow-ups to what you said (TTS out, STT in) | Rubric for each answer plus a combined conversation score |

### 4.3 Fluency and pronunciation (beyond the transcript)
The current notebook only grades the *text*. DET speaking also grades *how* you speak. Ideas:
- Whisper **word timestamps** → speech rate (words/min), number and length of pauses, filler words ("um", "uh"), self-corrections.
- Phoneme-level pronunciation: wav2vec2 phoneme models, or a hosted pronunciation-assessment API.
- Show the transcript with colors marking hesitations and mispronounced words.

### 4.4 Score estimation (be honest about it)
- Rate each item on a CEFR-like scale, combine the ratings per subscore, and map to 10–160 using the published DET↔CEFR/IELTS concordance tables.
- **Calibration:** the official free practice test on the DET website gives a score range. Comparing your result on our mock with your official practice result lets us adjust the mapping.
- The UI should always present the result as an **estimate**, never as an official score.

### 4.5 Adaptivity
- Start with a simple **staircase**: right answer → harder item, wrong answer → easier item, with difficulty tagged by CEFR level (A1–C2).
- Later: Item Response Theory (1PL/2PL) once we have enough response data.

### 4.6 Exam-craft features (things people lose points on)
- Strict timers that auto-submit, like the real test.
- "No replay" listening mode.
- Templates and phrase banks for photo description, opinion answers, and summaries (who/what/where/why).
- A word-count meter and a "keep talking" meter so you use the full time.
- Simulated test conditions: full-screen mode, a warning when you look away from the screen (optional, for realism).

### 4.7 Architecture (decided)
Built in this repo, $0 budget, runs locally in Chrome/Edge on a PC:
- **Backend:** Python FastAPI (`backend/`). **Frontend:** React + TypeScript + Vite (`frontend/`).
- **LLM:** Ollama with `gemma3:4b` by default. It is free and local, and it can read images for the photo tasks.
- **Speech-to-text:** faster-whisper (local), with word timings for fluency.
- **Text-to-speech:** the browser's built-in voices.
- **Content:** a question bank written by Claude in `content/`, plus generated fake words and C-test gaps.
- **"Copy for Claude":** sends any answer to claude.ai for a free second opinion.

Original brainstorm notes:
- **Front end:** web app (React/Next.js) or, for a quick start, **Gradio/Streamlit** (closest to the current notebook).
- **Back end:** Python (FastAPI). Item generators, scorers, and adaptive engine are separate modules.
- **AI services:** STT (Whisper / faster-whisper, word timestamps), LLM for item generation and rubric grading (structured JSON output), TTS for listening items and the Interactive Speaking examiner, a vision model for photo tasks.
- **Data:** a pre-generated, human-reviewed **item bank** (better quality and cheaper than generating every item live), plus user attempts and scores in SQLite/Postgres.
- The current notebook uses Dolly-v2-3B (2023), which is too weak for reliable rubric grading. Replacing it with a modern LLM would be the first upgrade.

### 4.8 Phased roadmap
1. **MVP: Speaking & Writing coach** (builds on the existing project). Read Then Speak, Speak About the Photo, Writing Sample, and Write About the Photo, each with rubric feedback and fluency measures.
2. **Interactive Speaking.** A conversational AI examiner.
3. **Objective items.** Read and Select, Fill in the Blanks, C-test, Listen and Type.
4. **Interactive Reading & Listening.** Longer generated sets.
5. **Full adaptive mock test.** Score estimate, history dashboard, and error notebook.
6. Later: other exams (IELTS, TOEFL, PTE) reusing the same engine, with different item templates and rubrics.

---

## 5. Decisions from the project owner
- Budget: $0, so only free local models.
- Platform: a local web app for PC/laptop browsers, which can be published later.
- AI: Claude writes the content while the app is being built. Local models grade at runtime, and a Copy-for-Claude button gives a second opinion.
- Goal: build the app. There is no exam date.

## Sources
- Duolingo, *Questions Guide 2026* (PDF): https://englishtest-static.duolingo.com/media/resources/Questions%20Guide%202026.pdf
- Duolingo, *DET Scoring Guide for Teachers (2026)*: https://englishtest-static.duolingo.com/media/resources/DET_Scoring%20Guide%20for%20Teachers%20(2026).pdf
- Duolingo blog, *How is the DET scored*: https://blog.englishtest.duolingo.com/how-is-the-duolingo-english-test-scored/
- Duolingo blog, *DET subscores*: https://blog.englishtest.duolingo.com/det-subscores
- Prepingo, *DET format 2026*: https://prepingo.io/blog/det-latest-format-2026
- AbroadCube, *All 13 question types*: https://abroadcube.com/blog/det-all-13-question-types-explained
- Goarno, *Interactive Speaking* / *Interactive Listening* / *Interactive Writing* guides: https://goarno.io/blog/interactive-speaking-duolingo-english-test/ · https://goarno.io/blog/interactive-listening/ · https://goarno.io/blog/interactive-writing-duolingo-english-test/
- Times Higher Education, *Interactive reading explained*: https://www.timeshighereducation.com/student/blogs/duolingo-english-test-interactive-reading
- DETPractice, *How many questions*: https://www.detpractice.com/how-many-questions-in-duolingo-english-test

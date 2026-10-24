# Duolingo English Test (DET): Research & Practice-Tool Brainstorm

> Status: research and brainstorm draft (October 2026). Figures come from public prep guides that
> describe the format as of the July 2025 update. Those guides disagree on a few timings (marked ⚠️).
> Before anything ships, check them against Duolingo's official *Questions Guide 2026*:
> https://englishtest-static.duolingo.com/media/resources/Questions%20Guide%202026.pdf

---

## 1. The test at a glance

| Aspect | Detail |
|---|---|
| Length | About 1 hour: ~5 min setup, ~45 min **adaptive** graded section, ~10 min Writing + Speaking Samples |
| Delivery | Online, at home, AI and human proctoring, taken on your own computer |
| Adaptive | Each answer changes the difficulty of the next question, so the number of questions varies by person |
| Score scale | **10–160** overall |
| Subscores | **Individual:** Reading, Listening, Writing, Speaking. **Integrated:** Literacy (R+W), Comprehension (R+L), Conversation (S+L), Production (W+S) |
| Grading | Objective items are scored by rules. Speaking and writing are scored by AI models trained on expert ratings |
| Production criteria | **Content** (relevant, developed) · **Coherence** (organized) · **Vocabulary & grammar** (range, accuracy) · **Fluency & pronunciation** (speaking only) |
| July 2025 change | **Interactive Speaking** was added. **Read Aloud** and **Listen, Then Speak** were removed |

The DET does **not** have separate fixed sections the way IELTS and TOEFL do. Question types are mixed
together, and most of them count toward **two** subscores.

---

## 2. All 13 question types

### Reading-heavy
| # | Type | What you do | Time | Count | Feeds |
|---|---|---|---|---|---|
| 1 | **Read and Select** | Pick the real English words from a grid of real and fake words | ~5 s/word (one shared timer) | 15–18 words | Reading, Literacy, Comprehension |
| 2 | **Fill in the Blanks** | Complete one missing word in a sentence (first letters are given) | ~20 s | 6–9 | Reading, Writing |
| 3 | **Read and Complete** (C-test) | Type the missing letters of words in an academic paragraph | 3 min | 3–6 | Reading, Writing, Literacy |
| 4 | **Interactive Reading** | One passage, six sub-tasks: *Complete the Sentences* (MCQ cloze), *Complete the Passage* (choose the missing sentence), *Highlight the Answer*, *Identify the Idea*, *Title the Passage* | ~7–8 min per set, shared ⚠️ | 2 sets × 6 | Reading, Comprehension |

### Listening-heavy
| # | Type | What you do | Time | Count | Feeds |
|---|---|---|---|---|---|
| 5 | **Listen and Type** (dictation) | Hear a sentence and type it exactly | ~1 min | 6–9 | Listening, Writing |
| 6 | **Interactive Listening** | Campus scenario (student↔student or student↔professor): *Listen and Complete*, then *Listen and Respond* (choose the best next line in the conversation, each turn plays once ⚠️), then *Summarize the Conversation* (written) | 6:30 shared + 75 s summary | 2 sets | Listening, Comprehension, Conversation |

### Writing
| # | Type | What you do | Time | Count | Feeds |
|---|---|---|---|---|---|
| 7 | **Write About the Photo** | Describe a picture (aim for 30–50+ words) | 1 min | 3 | Writing, Production |
| 8 | **Interactive Writing** | Part A: answer a prompt. Part B: answer a follow-up on the same topic | 30 s prep + 5 min, then ~3 min ⚠️ | 1 set | Writing, Production |
| 9 | **Writing Sample** | Same format as Interactive Writing Part A. Sent to institutions with your score | 30 s + 5 min | 1 | Writing |

### Speaking
| # | Type | What you do | Time | Count | Feeds |
|---|---|---|---|---|---|
| 10 | **Speak About the Photo** | Describe a picture out loud | ~20 s prep, 30–90 s speaking ⚠️ | 1 | Speaking, Production |
| 11 | **Read, Then Speak** | Read a prompt (with bullet guidance), then speak | 20 s prep, 30–90 s | 1 | Speaking, Production |
| 12 | **Interactive Speaking** (new) | An AI character (Bea / Oscar) asks 6–8 connected questions. Each one plays once | ~35 s per answer | 1 set | Speaking, Conversation |
| 13 | **Speaking Sample** | Speak on a prompt. Sent to institutions with your score | 30 s prep, 1–3 min | 1 | Speaking |

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

### 4.7 Suggested architecture
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

## 5. Open questions for the project owner
- Platform: keep it in Colab/Gradio for now, or move to a real web app?
- LLM / STT / TTS provider and budget (hosted APIs or local models)?
- Target DET score and deadline? This decides the order of the roadmap.
- Can you share your official DET practice-test results (and the official Questions Guide PDF) for calibration?

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

# CELPIP-General: research notes and how the app models it

Sources: the official **CELPIP Guidebook for Test Takers (2025)** (keep your copy in `docs/`;
it is copyrighted, so git ignores it), plus CELPIP's published test format for the details the
guidebook leaves out. Those details are marked ⚠️ below. Check them against CELPIP's two free
online practice tests at celpip.ca.

## The test at a glance (guidebook)

| Aspect | Detail |
|---|---|
| Versions | **CELPIP-General** (4 components) and **CELPIP-General LS** (Listening and Speaking only) |
| Delivery | Computer-delivered, one sitting of about 3 hours, with no separate speaking interview |
| Order | Listening → Reading → Writing → Speaking |
| Accent | North American English, everyday situations |
| Tools on test day | Personal timer, word counter, spell-check |
| Results | Online in your CELPIP account within days (the guidebook gives 4–5 calendar days; express rating is faster) |

| Component | Time | Parts and questions |
|---|---|---|
| Listening | 47–55 min | Practice task (unscored), then 6 parts: Problem Solving (8), Daily Life Conversation (5), Information (6), News Item (5), Discussion (8), Viewpoints (6). **38 questions** |
| Reading | 55–60 min | Practice task (unscored), then 4 parts: Correspondence (11), Apply a Diagram (8), Information (9), Viewpoints (10). **38 questions** |
| Writing | 53–60 min | Task 1: Writing an Email; Task 2: Responding to Survey Questions |
| Speaking | 15–20 min | Practice task (unscored), then 8 tasks: Giving Advice, Personal Experience, Describing a Scene, Making Predictions, Comparing and Persuading, Difficult Situation, Expressing Opinions, Unusual Situation |

Listening and Reading may contain unscored test-development content that looks like real
questions.

## CELPIP levels (guidebook)

Each component gets a CELPIP level, calibrated to the Canadian Language Benchmark (CLB):

| Level | CLB | Descriptor |
|---|---|---|
| 12, 11 | 12, 11 | Advanced proficiency in workplace and community contexts |
| 10 | 10 | Highly effective proficiency in workplace and community contexts |
| 9 | 9 | Effective proficiency in workplace and community contexts |
| 8 | 8 | Good proficiency in workplace and community contexts |
| 7 | 7 | Adequate proficiency in workplace and community contexts |
| 6 | 6 | Developing proficiency in workplace and community contexts |
| 5 | 5 | Acquiring proficiency in workplace and community contexts |
| 4 | 4 | Adequate proficiency for daily life activities |
| 3 | 3 | Some proficiency in limited contexts of personal relevance |
| 2 | 1, 2 | Limited ability in contexts related to immediate needs |
| 1, 0 | – | Insufficient information to assess |

The app's AI examiner grades writing and speaking on this 1–12 scale, using these descriptors.

## Details not in the guidebook ⚠️

- **Reading part times:** Part 1: 11 min, Part 2: 9 min, Part 3: 10 min, Part 4: 13 min.
- **Writing task times:** Task 1: 27 min, Task 2: 26 min, both 150–200 words.
- **Speaking preparation and speaking times:** Tasks 1 and 7: 30 s + 90 s. Tasks 2, 3, 4 and 8:
  30 s + 60 s. Task 6: 60 s + 60 s. Task 5: 60 s to choose an option, then 60 s + 60 s.
- **Grading categories** (CELPIP performance standards). Writing: Content/Coherence,
  Vocabulary, Readability, Task Fulfillment. Speaking: Content/Coherence, Vocabulary,
  Listenability, Task Fulfillment.

## How the app practises each part

| Part | In the app | Differences from the real test |
|---|---|---|
| Listening 1–6 | The browser reads the script aloud, once, with a different voice for each speaker. Then questions appear one at a time, 30 s each. Afterwards you see the transcript and explanations, and can listen again | ⚠️ The real test only states the total time; 30 s per question is the app's choice. In Parts 1–3 the question is read aloud **and** shown on screen. Part 5 is a video on the real test; here you hear audio and see who is speaking |
| Reading 1–4 | The passage (message, diagram or article) sits beside the questions. Multiple choice, dropdown blanks in a reply or comment, and paragraph matching (A–D, or E for not given), with the real part timer | Explanations after you submit |
| Writing 1–2 | Email with three points, or a survey with Option A or B, a 150–200 word counter and the browser's spell-check | — |
| Speaking 1–8 | Preparation, then recording; speech-to-text and fluency measures; graded on the four CELPIP categories | Tasks 3 and 4 use your own photos from `content/photos/`. Task 8 uses simple drawings of unusual objects; the AI examiner gets a written description of each drawing |

## Question bank

All questions are original, written for this app (none are copied from CELPIP materials):

- 3 sets for each listening part and each reading part, matching the official question counts,
  with answer keys and short explanations. Correct answers are spread evenly across A–D.
- 10 email tasks, 10 survey tasks, and 6–10 prompts for each speaking task, plus 6 drawings
  for Task 8.

The tests in `backend/tests/test_celpip_content.py` check the official question counts, answer
keys, blanks and IDs whenever the bank changes.

## Next steps

- Full test mode: the four components in order, with the official section times, and an
  approximate CELPIP level for Listening and Reading from the number of correct answers.
- CELPIP-General LS (Listening and Speaking only) can reuse the same parts.

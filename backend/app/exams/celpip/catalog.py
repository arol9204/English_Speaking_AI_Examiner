"""Catalog of CELPIP-General components and tasks.

From the CELPIP Guidebook for Test Takers (2025): the four components, their order, the parts and
question counts, the time for each component, and the CELPIP level descriptors.
Not in the guidebook, so taken from CELPIP's published test format (check against the official
free practice tests): the time for each Reading part, the preparation and speaking time for each
Speaking task, and the writing/speaking performance categories used for grading.
In Listening, this app gives 30 seconds per question; the real test only states the total time.
"""

WRITING_CRITERIA = ["content_coherence", "vocabulary", "readability", "task_fulfillment"]
SPEAKING_CRITERIA = ["content_coherence", "vocabulary", "listenability", "task_fulfillment"]

CRITERIA = {
    "content_coherence": {
        "name": "Content/Coherence",
        "description": "Number and quality of ideas, how clearly they are organized, and the examples "
        "and supporting details.",
    },
    "vocabulary": {
        "name": "Vocabulary",
        "description": "Word choice: suitable, precise and varied words and phrases, used accurately.",
    },
    "readability": {
        "name": "Readability",
        "description": "Format and paragraphing, connectors and transitions, grammar and sentence "
        "structure, spelling and punctuation.",
    },
    "listenability": {
        "name": "Listenability",
        "description": "Rhythm, pronunciation and intonation; pauses, fillers and self-corrections; "
        "grammar and sentence variety. Judge pauses and fillers from the speech measurements below, "
        "and pronunciation from the list of words the speech recognizer was unsure about.",
    },
    "task_fulfillment": {
        "name": "Task Fulfillment",
        "description": "Relevance, completeness (every part of the task is answered), a tone that suits "
        "the reader or listener, and length.",
    },
}

LEVEL_DESCRIPTIONS = {
    "12": "Advanced proficiency in workplace and community contexts",
    "11": "Advanced proficiency in workplace and community contexts",
    "10": "Highly effective proficiency in workplace and community contexts",
    "9": "Effective proficiency in workplace and community contexts",
    "8": "Good proficiency in workplace and community contexts",
    "7": "Adequate proficiency in workplace and community contexts",
    "6": "Developing proficiency in workplace and community contexts",
    "5": "Acquiring proficiency in workplace and community contexts",
    "4": "Adequate proficiency for daily life activities",
    "3": "Some proficiency in limited contexts of personal relevance",
    "2": "Limited ability in contexts related to immediate needs",
    "1": "Insufficient information to assess",
}

SECONDS_PER_LISTENING_QUESTION = 30


def _listening(part: int, name: str, questions: int, summary: str, tips: list[str], **extra) -> dict:
    return {
        "key": f"celpip_listening_{part}",
        "screen": "mc_listening",
        "kind": "auto",
        "name": f"Part {part}: {name}",
        "subscore": "Listening",
        "time_seconds": SECONDS_PER_LISTENING_QUESTION,
        "time_note": f"Audio once, then {SECONDS_PER_LISTENING_QUESTION} s per question",
        "prep_seconds": 0,
        "count": f"{questions} questions",
        "question_count": questions,
        "summary": summary,
        "tips": tips,
        "available": True,
        **extra,
    }


def _reading(part: int, name: str, questions: int, minutes: int, summary: str, tips: list[str]) -> dict:
    return {
        "key": f"celpip_reading_{part}",
        "screen": "mc_reading",
        "kind": "auto",
        "name": f"Part {part}: {name}",
        "subscore": "Reading",
        "time_seconds": minutes * 60,
        "prep_seconds": 0,
        "count": f"{questions} questions",
        "question_count": questions,
        "summary": summary,
        "tips": tips,
        "available": True,
    }


def _speaking(task: int, name: str, prep: int, speak: int, summary: str, instruction: str,
              tips: list[str], **extra) -> dict:
    return {
        "key": f"celpip_speaking_{task}",
        "screen": "speaking",
        "kind": "speaking",
        "name": f"Task {task}: {name}",
        "subscore": "Speaking",
        "time_seconds": speak,
        "prep_seconds": prep,
        "count": "1",
        "summary": summary,
        "instruction": instruction,
        "tips": tips,
        "criteria": SPEAKING_CRITERIA,
        "available": True,
        **extra,
    }


TASKS = [
    _listening(
        1, "Listening to Problem Solving", 8,
        "A conversation about a problem, heard in 3 sections. After each section, answer 2 or 3 "
        "questions.",
        [
            "Each section plays only once, so take notes as you listen.",
            "Follow the problem, the solutions the speakers suggest, and what they decide.",
        ],
        sections_note="You will hear a conversation in 3 sections. You will hear each section only once.",
        speak_questions=True,
    ),
    _listening(
        2, "Listening to a Daily Life Conversation", 5,
        "An everyday conversation between two people, then 5 questions.",
        ["Listen for who the speakers are, what they want, and what they agree to do."],
        speak_questions=True,
    ),
    _listening(
        3, "Listening for Information", 6,
        "One person gives another information about a service, a plan or a procedure, then 6 "
        "questions.",
        ["Note numbers, dates, names and the steps the speaker explains."],
        speak_questions=True,
    ),
    _listening(
        4, "Listening to a News Item", 5,
        "A short news report, then 5 questions.",
        ["Listen for what happened, where, who was involved, and what happens next."],
    ),
    _listening(
        5, "Listening to a Discussion", 8,
        "A discussion between three people, then 8 questions. The real test shows a video; here you "
        "hear the audio and see who is speaking.",
        ["Keep track of each person's opinion and how the discussion ends."],
    ),
    _listening(
        6, "Listening for Viewpoints", 6,
        "A report that presents different opinions on an issue, then 6 questions.",
        ["Separate the speaker's facts from each side's opinions and reasons."],
    ),
    _reading(
        1, "Reading Correspondence", 11, 11,
        "Read a message and answer 6 questions, then complete 5 blanks in a reply to it.",
        [
            "Read the whole message once before you answer.",
            "For the reply, choose the option that matches the facts in the first message.",
        ],
    ),
    _reading(
        2, "Reading to Apply a Diagram", 8, 9,
        "Use a diagram, such as a schedule or a price list, to complete 5 blanks in an email, then "
        "answer 3 questions about the email.",
        ["Check each blank against the diagram: numbers, days and conditions matter."],
    ),
    _reading(
        3, "Reading for Information", 9, 10,
        "Decide which paragraph (A, B, C or D) contains each piece of information, or E if none of "
        "them does.",
        [
            "Skim the four paragraphs first so you know what each one is about.",
            "Choose E only when no paragraph says it, not when the idea is merely similar.",
        ],
    ),
    _reading(
        4, "Reading for Viewpoints", 10, 13,
        "Read an article that presents different opinions. Answer 5 questions, then complete 5 blanks "
        "in a reader's comment.",
        ["Note who holds each opinion and what reasons they give."],
    ),
    {
        "key": "celpip_writing_1",
        "screen": "writing",
        "kind": "writing",
        "name": "Task 1: Writing an Email",
        "subscore": "Writing",
        "time_seconds": 27 * 60,
        "prep_seconds": 0,
        "count": "1",
        "word_range": [150, 200],
        "spellcheck": True,
        "summary": "Write an email of 150–200 words that does three things the task asks for.",
        "tips": [
            "Answer all three points, each in its own paragraph.",
            "Match the tone to the reader: friendly for a friend, polite and formal for a company.",
            "Keep a few minutes at the end to check your email.",
        ],
        "criteria": WRITING_CRITERIA,
        "available": True,
    },
    {
        "key": "celpip_writing_2",
        "screen": "writing",
        "kind": "writing",
        "name": "Task 2: Responding to Survey Questions",
        "subscore": "Writing",
        "time_seconds": 26 * 60,
        "prep_seconds": 0,
        "count": "1",
        "word_range": [150, 200],
        "spellcheck": True,
        "summary": "Read a survey question, choose one of two options, and explain your choice in "
        "150–200 words.",
        "tips": [
            "Pick the option you can support best, not the one you think the reader wants.",
            "Give two or three clear reasons, each with an example.",
        ],
        "criteria": WRITING_CRITERIA,
        "available": True,
    },
    _speaking(
        1, "Giving Advice", 30, 90,
        "Give advice to someone about a situation.",
        "Advise the person in the situation below. Speak as if you are talking to them.",
        ["Give two or three pieces of advice and a reason for each."],
    ),
    _speaking(
        2, "Talking about a Personal Experience", 30, 60,
        "Talk about something that happened to you.",
        "Talk about the experience described below.",
        ["Say what happened, when and where, how you felt, and what you learned."],
    ),
    _speaking(
        3, "Describing a Scene", 30, 60,
        "Describe what is happening in a picture.",
        "Describe some things that are happening in the picture as well as you can. The person you "
        "are speaking to cannot see the picture.",
        ["Describe where things are and what people are doing, from the most important to the least."],
        needs_photos=True,
    ),
    _speaking(
        4, "Making Predictions", 30, 60,
        "Look at a picture and say what will probably happen next.",
        "In this picture, what do you think will most probably happen next?",
        ["Make several predictions and say why you think each one will happen."],
        needs_photos=True,
    ),
    _speaking(
        5, "Comparing and Persuading", 60, 60,
        "Choose one of two options, then persuade someone that it is better than the option they prefer.",
        "Persuade the other person that your choice is better than theirs.",
        [
            "Use the details of both options to compare them.",
            "Explain why your choice is better for the other person too.",
        ],
        choose_seconds=60,
    ),
    _speaking(
        6, "Dealing with a Difficult Situation", 60, 60,
        "Choose how to handle a difficult situation and speak to the person involved.",
        "Choose ONE of the options below and speak to that person.",
        ["Be polite and tactful, explain the situation, and suggest a solution."],
    ),
    _speaking(
        7, "Expressing Opinions", 30, 90,
        "Give and support your opinion on a question.",
        "Answer the question below. Explain your opinion with reasons and examples.",
        ["State your opinion first, then give two or three reasons with examples."],
    ),
    _speaking(
        8, "Describing an Unusual Situation", 30, 60,
        "Describe an unusual object in a picture to someone who cannot see it.",
        "Describe the picture to the person in the situation below. They cannot see it.",
        ["Describe its shape, size, colour and parts, and say what it might be used for."],
    ),
]

EXAM = {
    "key": "celpip",
    "name": "CELPIP-General",
    "short_name": "CELPIP",
    "summary": "Canada's computer-delivered English test, used for permanent residence and professional "
    "designations. Everyday Canadian English with a North American accent.",
    "facts": [
        {"label": "Length", "value": "About 3 hours, one sitting"},
        {"label": "Format", "value": "On a computer, always in this order"},
        {"label": "Scores", "value": "CELPIP level 1–12 for each skill (matches CLB levels)"},
    ],
    "skills": ["Listening", "Reading", "Writing", "Speaking"],
    "skill_times": {
        "Listening": "47–55 minutes",
        "Reading": "55–60 minutes",
        "Writing": "53–60 minutes",
        "Speaking": "15–20 minutes",
    },
    "source": "the CELPIP Guidebook for Test Takers (2025)",
    "scale": {"name": "CELPIP level", "levels": [str(n) for n in range(1, 13)],
              "descriptions": LEVEL_DESCRIPTIONS},
    "criteria": CRITERIA,
    "available": True,
    "tasks": TASKS,
}

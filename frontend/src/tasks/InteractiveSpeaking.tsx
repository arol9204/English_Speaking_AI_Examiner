import { useEffect, useRef, useState } from "react";
import { api, fetchItem } from "../api";
import { useCountdown } from "../hooks";
import { Recorder } from "../recorder";
import { speak, ttsSupported } from "../speech";
import { Timer } from "../components/Timer";
import { FeedbackView } from "../components/Feedback";
import type { Feedback, TaskProps } from "../types";

type Difficulty = "easy" | "hard";

interface Topic {
  id: string;
  topic: string;
  questions: Record<Difficulty, string>[];
}
interface Item {
  id: string;
  topics: Topic[];
}
interface Transcript {
  text: string;
  fluency: Record<string, unknown>;
  strength: "strong" | "ok" | "weak";
}
interface TurnRecord {
  question: string;
  difficulty: Difficulty;
  audioUrl?: string;
  transcript: string | null; // null = speech-to-text failed, the user can type it later
  fluency: Record<string, unknown>;
}

const EXAMINER = "Alex";
const LEVEL_SCORE: Record<string, number> = { A1: 0, A2: 0.2, B1: 0.4, B2: 0.6, C1: 0.8, C2: 1 };
// How long to wait for a transcript before choosing the next question anyway.
const ADAPT_WAIT_MS = 10000;

function Examiner({ talking }: { talking: boolean }) {
  return (
    <div className="examiner">
      <div className={`avatar ${talking ? "talking" : ""}`}>{EXAMINER[0]}</div>
      <div className="muted small">{EXAMINER}, your examiner</div>
    </div>
  );
}

/** One question: the examiner speaks once, then the user has 35 seconds to answer. */
function TurnView({ spoken, seconds, onFinished }: {
  spoken: string;
  seconds: number;
  onFinished: (audio: Blob | null) => void;
}) {
  const [phase, setPhase] = useState<"asking" | "answering">("asking");
  const [recording, setRecording] = useState(false);
  const [micError, setMicError] = useState<string>();
  const recorder = useRef(new Recorder());
  const isRecording = useRef(false);
  const finished = useRef(false);
  const asked = useRef(false);

  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    speak(spoken).then(() => setPhase("answering"));
  }, [spoken]);

  const finish = async () => {
    if (finished.current) return;
    finished.current = true;
    onFinished(isRecording.current ? await recorder.current.stop() : null);
  };

  const record = async () => {
    try {
      await recorder.current.start();
      isRecording.current = true;
      setRecording(true);
    } catch {
      setMicError("Could not use the microphone. Allow microphone access in the browser.");
    }
  };

  const { left } = useCountdown(seconds, phase === "answering", finish);

  return (
    <div className="center-stack">
      <Examiner talking={phase === "asking"} />
      {phase === "asking" ? (
        <p className="prompt-label">Listen carefully. You will hear the question only once.</p>
      ) : (
        <>
          <Timer left={left} total={seconds} label={recording ? "● Recording" : "Answer"}
            recording={recording} />
          {recording ? (
            <button className="stop" onClick={finish}>Next</button>
          ) : (
            <button className="record" onClick={record}>● Record now</button>
          )}
          {micError && <div className="notice bad">{micError}</div>}
        </>
      )}
    </div>
  );
}

export default function InteractiveSpeaking({ task, onDone }: TaskProps) {
  const [item, setItem] = useState<Item>();
  const [turns, setTurns] = useState<TurnRecord[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [phase, setPhase] = useState<"talking" | "thinking" | "manual" | "grading" | "done">("talking");
  const [feedback, setFeedback] = useState<Feedback>();
  const [typed, setTyped] = useState<Record<number, string>>({});
  const [error, setError] = useState<string>();
  const pending = useRef<Promise<void>[]>([]);
  const turnsRef = useRef<TurnRecord[]>([]);

  useEffect(() => {
    fetchItem<Item>(task.key).then(setItem, (e) => setError(e.message));
  }, [task.key]);

  const plan = item?.topics.flatMap((topic, t) =>
    topic.questions.map((q, i) => ({ topic, first: i === 0, firstTopic: t === 0, q })),
  ) ?? [];

  const updateTurn = (index: number, change: Partial<TurnRecord>) => {
    turnsRef.current = turnsRef.current.map((t, i) => (i === index ? { ...t, ...change } : t));
    setTurns(turnsRef.current);
  };

  const grade = (all: TurnRecord[]) => {
    setPhase("grading");
    api.post<Feedback>("/api/feedback/interactive_speaking", {
      turns: all.map((t) => ({ question: t.question, transcript: t.transcript ?? "", fluency: t.fluency })),
    }).then((f) => {
      setFeedback(f);
      setPhase("done");
      onDone(f.ai ? LEVEL_SCORE[f.ai.overall_level] ?? null : null);
    }, (e) => setError(e.message));
  };

  const finishConversation = async () => {
    setPhase("thinking");
    await Promise.all(pending.current);
    if (turnsRef.current.some((t) => t.transcript === null)) setPhase("manual");
    else grade(turnsRef.current);
  };

  const onTurnFinished = async (audio: Blob | null) => {
    const index = turnsRef.current.length;
    const turn: TurnRecord = {
      question: plan[index].q[difficulty],
      difficulty,
      audioUrl: audio ? URL.createObjectURL(audio) : undefined,
      transcript: audio ? null : "",
      fluency: audio ? {} : { note: "no answer recorded" },
    };
    turnsRef.current = [...turnsRef.current, turn];
    setTurns(turnsRef.current);

    // Transcribe in the background; the result also decides how hard the next question is.
    const result: { strength: Transcript["strength"] } = { strength: "weak" };
    if (audio) {
      const form = new FormData();
      form.append("task", task.key);
      form.append("audio", audio, audio.type.includes("ogg") ? "answer.ogg" : "answer.webm");
      const job = api.upload<Transcript>("/api/transcribe", form).then((t) => {
        updateTurn(index, { transcript: t.text, fluency: t.fluency });
        result.strength = t.strength;
      }, () => undefined);
      pending.current.push(job);
      setPhase("thinking");
      await Promise.race([job, new Promise((r) => setTimeout(r, ADAPT_WAIT_MS))]);
    }
    if (result.strength === "strong") setDifficulty("hard");
    else if (result.strength === "weak") setDifficulty("easy");

    if (index + 1 >= plan.length) finishConversation();
    else setPhase("talking");
  };

  if (!ttsSupported) return <div className="notice">This browser cannot play speech. Use Chrome or Edge.</div>;
  if (error) return <div className="notice">{error}</div>;
  if (!item) return <p className="muted">Loading…</p>;

  if (phase === "talking" || phase === "thinking") {
    const index = turns.length;
    if (phase === "thinking" || index >= plan.length) {
      return (
        <div className="center-stack">
          <Examiner talking={false} />
          <div className="spinner" />
        </div>
      );
    }
    const step = plan[index];
    const topicName = step.topic.topic.toLowerCase();
    let intro = "";
    if (step.first) {
      intro = step.firstTopic
        ? `Hi, I'm ${EXAMINER}. Let's talk about ${topicName}. `
        : `Thank you. Now let's talk about ${topicName}. `;
    }
    return (
      <div>
        <p className="muted">Question {index + 1} of {plan.length}</p>
        <TurnView key={index} spoken={intro + step.q[difficulty]} seconds={task.time_seconds}
          onFinished={onTurnFinished} />
      </div>
    );
  }

  if (phase === "manual") {
    return (
      <div>
        <div className="notice">
          Speech-to-text is not available, so type what you said in each answer (including “um” and “uh”).
        </div>
        {turns.map((t, i) => (
          <div key={i} className="turn">
            <p><strong>Q{i + 1}.</strong> {t.question}</p>
            {t.audioUrl && <audio controls src={t.audioUrl} />}
            {t.transcript === null && (
              <textarea className="answer-box short" value={typed[i] ?? ""}
                onChange={(e) => setTyped((old) => ({ ...old, [i]: e.target.value }))} />
            )}
          </div>
        ))}
        <button onClick={() => grade(turns.map((t, i) => (t.transcript === null
          ? { ...t, transcript: typed[i] ?? "", fluency: { note: "typed by the user" } }
          : t)))}>
          Get feedback
        </button>
      </div>
    );
  }

  if (phase === "grading") {
    return (
      <div className="center-stack">
        <div className="spinner" />
        <p>The local AI is grading the whole conversation…</p>
      </div>
    );
  }

  return (
    <div>
      <h3>Your conversation</h3>
      {turns.map((t, i) => (
        <div key={i} className="turn">
          <p>
            <strong>Q{i + 1}.</strong> {t.question}{" "}
            <span className="tag">{t.difficulty === "hard" ? "harder question" : "easier question"}</span>
          </p>
          {t.audioUrl && <audio controls src={t.audioUrl} />}
          <p className="your-answer">{t.transcript || <em>(no answer)</em>}</p>
          {feedback?.ai?.per_answer?.[i] && <p className="muted">💬 {feedback.ai.per_answer[i]}</p>}
        </div>
      ))}
      {feedback && <FeedbackView feedback={feedback} />}
    </div>
  );
}

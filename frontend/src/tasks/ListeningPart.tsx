import { useEffect, useRef, useState } from "react";
import { api, fetchItem } from "../api";
import { useCountdown } from "../hooks";
import { assignVoices, loadVoices, playScript, speak, ttsSupported, type ScriptLine, type VoiceChoice } from "../speech";
import { Timer } from "../components/Timer";
import { ScoreBanner } from "../components/Result";
import { MultipleChoice } from "../components/Choices";
import type { CheckResult, ChoiceQuestion, TaskProps } from "../types";

interface Speaker {
  name: string;
  gender: string;
}

interface Section {
  lines: ScriptLine[];
  questions: ChoiceQuestion[];
}

interface Item {
  id: string;
  title: string;
  context: string;
  scene?: string;
  speakers: Record<string, Speaker>;
  sections: Section[];
}

type Phase = "intro" | "playing" | "question" | "checking" | "done";

function Speakers({ speakers, talking }: { speakers: Record<string, Speaker>; talking?: string }) {
  return (
    <div className="speakers">
      {Object.entries(speakers).map(([id, s]) => (
        <div key={id} className={`speaker ${talking === id ? "talking" : ""}`}>
          <div className="speaker-avatar" aria-hidden="true">{s.name[0]}</div>
          <div className="small">{s.name}</div>
        </div>
      ))}
    </div>
  );
}

/** One question: read aloud first when the task says so, then a fixed time to answer. */
function QuestionStep({ question, seconds, speakFirst, value, onChange, onNext, isLast }: {
  question: ChoiceQuestion;
  seconds: number;
  speakFirst: boolean;
  value: number | null;
  onChange: (v: number) => void;
  onNext: () => void;
  isLast: boolean;
}) {
  const [ready, setReady] = useState(!speakFirst);
  const asked = useRef(false);

  useEffect(() => {
    if (!speakFirst || asked.current) return;
    asked.current = true;
    speak(question.prompt ?? "").then(() => setReady(true));
  }, [speakFirst, question.prompt]);

  const { left } = useCountdown(seconds, ready, onNext);

  return (
    <div>
      {ready ? <Timer left={left} total={seconds} /> : <p className="muted small center">Listen to the question…</p>}
      <MultipleChoice question={question} value={value} onChange={onChange} />
      <button onClick={onNext}>{isLast ? "Finish" : "Next"}</button>
    </div>
  );
}

export default function ListeningPart({ task, onDone }: TaskProps) {
  const [item, setItem] = useState<Item>();
  const [voices, setVoices] = useState<Record<string, VoiceChoice>>({});
  const [phase, setPhase] = useState<Phase>("intro");
  const [section, setSection] = useState(0);
  const [question, setQuestion] = useState(0);
  const [line, setLine] = useState<number>();
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [result, setResult] = useState<CheckResult>();
  const [replaying, setReplaying] = useState(false);
  const [error, setError] = useState<string>();
  const stop = useRef<() => void>();

  useEffect(() => {
    fetchItem<Item>(task.key).then(async (it) => {
      setVoices(assignVoices(it.speakers, await loadVoices()));
      setItem(it);
    }, (e) => setError(e.message));
    return () => stop.current?.();
  }, [task.key]);

  const play = (index: number) => {
    setSection(index);
    setPhase("playing");
    stop.current = playScript(item!.sections[index].lines, voices, setLine, () => {
      setLine(undefined);
      setQuestion(0);
      setPhase("question");
    });
  };

  const submit = () => {
    setPhase("checking");
    api.post<CheckResult>(`/api/check/${task.key}`, { item_id: item!.id, answers }).then((r) => {
      setResult(r);
      setPhase("done");
      onDone(r.score);
      window.scrollTo({ top: 0 });
    }, (e) => setError(e.message));
  };

  const next = () => {
    const questions = item!.sections[section].questions;
    if (question + 1 < questions.length) setQuestion(question + 1);
    else if (section + 1 < item!.sections.length) play(section + 1);
    else submit();
  };

  const replay = () => {
    stop.current?.();
    setReplaying(true);
    const all = item!.sections.flatMap((s) => s.lines);
    stop.current = playScript(all, voices, () => undefined, () => setReplaying(false));
  };

  if (!ttsSupported) return <div className="notice">This browser cannot play speech. Use Chrome or Edge.</div>;
  if (error) return <div className="notice">{error}</div>;
  if (!item) return <p className="muted">Loading…</p>;

  const current = item.sections[section];
  const talking = line !== undefined ? current.lines[line]?.speaker : undefined;

  if (phase === "intro") {
    return (
      <div className="center-stack">
        <p className="prompt-label">{item.context}</p>
        {item.scene && <p className="muted">Scene: {item.scene}</p>}
        <Speakers speakers={item.speakers} />
        <p className="muted small">
          {task.sections_note ?? "You will hear the recording only once."} Questions come after the recording.
        </p>
        <button className="speaker-button" onClick={() => play(0)}>▶ Start listening</button>
      </div>
    );
  }
  if (phase === "playing") {
    return (
      <div className="center-stack">
        {item.sections.length > 1 && <p className="muted">Section {section + 1} of {item.sections.length}</p>}
        <p className="prompt-label">Listen carefully. You will hear this only once.</p>
        {item.scene && <p className="muted">Scene: {item.scene}</p>}
        <Speakers speakers={item.speakers} talking={talking} />
      </div>
    );
  }
  if (phase === "question") {
    const q = current.questions[question];
    const isLast = section === item.sections.length - 1 && question === current.questions.length - 1;
    return (
      <div className="listening-question">
        <p className="muted small">
          {item.sections.length > 1 && `Section ${section + 1} of ${item.sections.length} · `}
          Question {question + 1} of {current.questions.length}
        </p>
        <QuestionStep key={q.id} question={q} seconds={task.time_seconds} speakFirst={!!task.speak_questions}
          value={answers[q.id] ?? null} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
          onNext={next} isLast={isLast} />
      </div>
    );
  }
  if (phase === "checking" || !result) return <p className="muted">Checking your answers…</p>;

  const results = Object.fromEntries(result.results.map((r) => [r.id, r]));
  return (
    <div>
      <ScoreBanner score={result.score} label={`${result.correct} of ${result.total} correct`} />
      <div className="row">
        <button className="secondary" onClick={replay} disabled={replaying}>
          {replaying ? "Playing…" : "▶ Listen again"}
        </button>
        {replaying && <button className="secondary" onClick={() => { stop.current?.(); setReplaying(false); }}>Stop</button>}
      </div>
      {item.sections.map((s, i) => (
        <section key={i} className="listening-review">
          {item.sections.length > 1 && <h3>Section {i + 1}</h3>}
          <details open={item.sections.length === 1}>
            <summary>Transcript</summary>
            <div className="transcript">
              {s.lines.map((l, j) => (
                <p key={j}><strong>{item.speakers[l.speaker]?.name ?? l.speaker}:</strong> {l.text}</p>
              ))}
            </div>
          </details>
          {s.questions.map((q) => (
            <MultipleChoice key={q.id} question={q} value={answers[q.id] ?? null} result={results[q.id]}
              onChange={() => undefined} />
          ))}
        </section>
      ))}
    </div>
  );
}

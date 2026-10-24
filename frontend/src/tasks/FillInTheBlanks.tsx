import { useEffect, useRef, useState } from "react";
import { api, fetchItem } from "../api";
import { useCountdown } from "../hooks";
import { Timer } from "../components/Timer";
import { GapInput } from "../components/GapInput";
import type { TaskProps } from "../types";

interface Item {
  id: string;
  before: string;
  prefix: string;
  missing_length: number;
  after: string;
}
interface Result {
  correct: boolean;
  answer: string;
  word: string;
}

export default function FillInTheBlanks({ task, level, onDone }: TaskProps) {
  const [item, setItem] = useState<Item>();
  const [value, setValue] = useState("");
  const [result, setResult] = useState<Result>();
  const [error, setError] = useState<string>();
  const submitted = useRef(false);

  useEffect(() => {
    fetchItem<Item>(task.key, level).then(setItem, (e) => setError(e.message));
  }, [task.key, level]);

  const submit = () => {
    if (!item || submitted.current) return;
    submitted.current = true;
    api.post<Result>(`/api/check/${task.key}`, { item_id: item.id, answers: value }).then((r) => {
      setResult(r);
      onDone(r.correct ? 1 : 0);
    }, (e) => setError(e.message));
  };

  const { left } = useCountdown(task.time_seconds, !!item && !result, submit);

  if (error) return <div className="notice">{error}</div>;
  if (!item) return <p className="muted">Loading…</p>;
  return (
    <div className="center-stack">
      {!result && <Timer left={left} total={task.time_seconds} />}
      <p className="prompt-label">Type the missing letters to complete the text below.</p>
      <p className="passage sentence">
        {item.before}
        <GapInput gap={item} value={value} onChange={setValue} disabled={!!result} autoFocus
          onEnter={submit} state={result ? (result.correct ? "ok" : "wrong") : undefined} />
        {item.after}
      </p>
      {result ? (
        <div className={`notice ${result.correct ? "good" : "bad"}`}>
          {result.correct ? "Correct!" : <>The word was <strong>{result.word}</strong>.</>}
        </div>
      ) : (
        <button onClick={submit}>Continue</button>
      )}
    </div>
  );
}

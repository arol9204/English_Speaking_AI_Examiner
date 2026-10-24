import { useEffect, useRef, useState } from "react";
import { api, fetchItem } from "../api";
import { useCountdown } from "../hooks";
import { Timer } from "../components/Timer";
import { GapInput } from "../components/GapInput";
import { ScoreBanner } from "../components/Result";
import type { Segment, TaskProps } from "../types";

interface Item {
  id: string;
  title: string;
  segments: Segment[];
}
interface Result {
  score: number;
  results: { answer: string; typed: string; correct: boolean }[];
}

export default function ReadAndComplete({ task, level, onDone }: TaskProps) {
  const [item, setItem] = useState<Item>();
  const [values, setValues] = useState<string[]>([]);
  const [result, setResult] = useState<Result>();
  const [error, setError] = useState<string>();
  const submitted = useRef(false);

  useEffect(() => {
    fetchItem<Item>(task.key, level).then(setItem, (e) => setError(e.message));
  }, [task.key, level]);

  const gapCount = item?.segments.filter((s) => s.type === "gap").length ?? 0;

  const submit = () => {
    if (!item || submitted.current) return;
    submitted.current = true;
    const answers = Array.from({ length: gapCount }, (_, i) => values[i] ?? "");
    api.post<Result>(`/api/check/${task.key}`, { item_id: item.id, answers }).then((r) => {
      setResult(r);
      onDone(r.score);
    }, (e) => setError(e.message));
  };

  const { left } = useCountdown(task.time_seconds, !!item && !result, submit);

  if (error) return <div className="notice">{error}</div>;
  if (!item) return <p className="muted">Loading…</p>;
  return (
    <div>
      {result ? (
        <ScoreBanner score={result.score}
          label={`${result.results.filter((r) => r.correct).length} of ${gapCount} words correct`} />
      ) : (
        <Timer left={left} total={task.time_seconds} />
      )}
      <p className="prompt-label">Type the missing letters to complete the text below.</p>
      <h3>{item.title}</h3>
      <p className="passage">
        {item.segments.map((s, i) => {
          if (s.type === "text") return <span key={i}>{s.text}</span>;
          const r = result?.results[s.index];
          return (
            <span key={i} title={r && !r.correct ? `${s.prefix}${r.answer}` : undefined}>
              <GapInput gap={s} value={r && !r.correct ? r.answer : (values[s.index] ?? "")}
                disabled={!!result} autoFocus={s.index === 0}
                state={r ? (r.correct ? "ok" : "wrong") : undefined}
                onChange={(v) => setValues((old) => {
                  const next = [...old];
                  next[s.index] = v;
                  return next;
                })} />
            </span>
          );
        })}
      </p>
      {result ? (
        <p className="muted">Red words show the correct ending. Hover to see the full word.</p>
      ) : (
        <button onClick={submit}>Continue</button>
      )}
    </div>
  );
}

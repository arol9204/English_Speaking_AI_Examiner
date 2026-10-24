import { useEffect, useState } from "react";
import { api, fetchItem } from "../api";
import { useCountdown } from "../hooks";
import { Timer } from "../components/Timer";
import { ScoreBanner } from "../components/Result";
import type { TaskProps } from "../types";

interface Item {
  id: string;
  words: string[];
}
interface Result {
  score: number;
  results: { word: string; real: boolean; answer: boolean | null; correct: boolean }[];
}

function WordCard({ word, seconds, onAnswer }: {
  word: string;
  seconds: number;
  onAnswer: (a: boolean | null) => void;
}) {
  const { left } = useCountdown(seconds, true, () => onAnswer(null));
  return (
    <div className="center-stack">
      <Timer left={left} total={seconds} />
      <p className="prompt-label">Is this a real English word?</p>
      <div className="big-word">{word}</div>
      <div className="row">
        <button className="answer-yes" onClick={() => onAnswer(true)}>Yes</button>
        <button className="answer-no" onClick={() => onAnswer(false)}>No</button>
      </div>
    </div>
  );
}

export default function ReadAndSelect({ task, level, onDone }: TaskProps) {
  const [item, setItem] = useState<Item>();
  const [answers, setAnswers] = useState<(boolean | null)[]>([]);
  const [result, setResult] = useState<Result>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    fetchItem<Item>(task.key, level).then(setItem, (e) => setError(e.message));
  }, [task.key, level]);

  const answer = (a: boolean | null) => {
    if (!item) return;
    const next = [...answers, a];
    setAnswers(next);
    if (next.length === item.words.length) {
      api.post<Result>(`/api/check/${task.key}`, { item_id: item.id, answers: next }).then((r) => {
        setResult(r);
        onDone(r.score);
      }, (e) => setError(e.message));
    }
  };

  if (error) return <div className="notice">{error}</div>;
  if (!item) return <p className="muted">Loading…</p>;
  if (result) {
    return (
      <div>
        <ScoreBanner score={result.score} label={`${result.results.filter((r) => r.correct).length} of ${result.results.length} correct`} />
        <table className="results-table">
          <thead><tr><th>Word</th><th>Is it real?</th><th>Your answer</th><th /></tr></thead>
          <tbody>
            {result.results.map((r) => (
              <tr key={r.word} className={r.correct ? "ok" : "wrong"}>
                <td className="mono">{r.word}</td>
                <td>{r.real ? "Real" : "Fake"}</td>
                <td>{r.answer === null ? "No answer (time ran out)" : r.answer ? "Yes" : "No"}</td>
                <td>{r.correct ? "✓" : "✗"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  const index = answers.length;
  return (
    <div>
      <p className="muted">Word {index + 1} of {item.words.length}</p>
      <WordCard key={index} word={item.words[index]} seconds={task.time_seconds} onAnswer={answer} />
    </div>
  );
}

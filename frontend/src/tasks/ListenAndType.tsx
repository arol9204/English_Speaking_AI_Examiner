import { useEffect, useRef, useState } from "react";
import { api, fetchItem } from "../api";
import { useCountdown } from "../hooks";
import { speak, ttsSupported } from "../speech";
import { Timer } from "../components/Timer";
import { ScoreBanner } from "../components/Result";
import type { TaskProps } from "../types";

interface Item {
  id: string;
  text: string;
}
interface Op {
  op: "equal" | "sub" | "del" | "ins";
  ref: string | null;
  hyp: string | null;
}
interface Result {
  score: number;
  ops: Op[];
  exact_match: boolean;
  reference: string;
}

function Diff({ ops }: { ops: Op[] }) {
  return (
    <p className="diff">
      {ops.map((op, i) => {
        if (op.op === "equal") return <span key={i}>{op.ref} </span>;
        if (op.op === "del") return <span key={i} className="missing" title="You missed this word">{op.ref} </span>;
        if (op.op === "ins") return <del key={i} title="Extra word">{op.hyp} </del>;
        return (
          <span key={i}>
            <del>{op.hyp}</del> <span className="missing">{op.ref}</span>{" "}
          </span>
        );
      })}
    </p>
  );
}

export default function ListenAndType({ task, level, onDone }: TaskProps) {
  const [item, setItem] = useState<Item>();
  const [text, setText] = useState("");
  const [plays, setPlays] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState<Result>();
  const [error, setError] = useState<string>();
  const submitted = useRef(false);
  const maxPlays = task.max_plays ?? 3;

  useEffect(() => {
    fetchItem<Item>(task.key, level).then(setItem, (e) => setError(e.message));
  }, [task.key, level]);

  const play = async () => {
    if (!item || plays >= maxPlays || playing) return;
    setPlays((p) => p + 1);
    setPlaying(true);
    await speak(item.text);
    setPlaying(false);
  };

  // Play once automatically when the question appears, like the real test.
  const autoPlayed = useRef(false);
  useEffect(() => {
    if (item && !autoPlayed.current) {
      autoPlayed.current = true;
      play();
    }
  }, [item]);

  const submit = () => {
    if (!item || submitted.current) return;
    submitted.current = true;
    speechSynthesis.cancel();
    api.post<Result>(`/api/check/${task.key}`, { item_id: item.id, answers: text }).then((r) => {
      setResult(r);
      onDone(r.score);
    }, (e) => setError(e.message));
  };

  const { left } = useCountdown(task.time_seconds, !!item && !result, submit);

  if (!ttsSupported) return <div className="notice">This browser cannot play speech. Use Chrome or Edge.</div>;
  if (error) return <div className="notice">{error}</div>;
  if (!item) return <p className="muted">Loading…</p>;
  return (
    <div className="center-stack">
      {result ? <ScoreBanner score={result.score} /> : <Timer left={left} total={task.time_seconds} />}
      <p className="prompt-label">Type the statement that you hear.</p>
      <button className="speaker" onClick={play} disabled={plays >= maxPlays || playing || !!result}>
        {playing ? "🔊 Playing…" : "🔊 Play"}
      </button>
      <p className="muted">{maxPlays - plays} plays left</p>
      <textarea className="answer-box short" value={text} onChange={(e) => setText(e.target.value)}
        disabled={!!result} placeholder="Type your response here" spellCheck={false} autoFocus />
      {result ? (
        <div className="result-block">
          <Diff ops={result.ops} />
          <p>Correct sentence: <strong>{result.reference}</strong></p>
          {!result.exact_match && result.score === 1 && (
            <p className="muted">All words right, but check capitals and punctuation: the real test counts them.</p>
          )}
          <p className="muted small">Red strike-through = your wrong or extra words. Highlighted = words you missed.</p>
        </div>
      ) : (
        <button onClick={submit}>Continue</button>
      )}
    </div>
  );
}

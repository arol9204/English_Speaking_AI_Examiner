import { useEffect, useState } from "react";
import { api, fetchItem } from "../api";
import { useCountdown } from "../hooks";
import { Timer } from "../components/Timer";
import { FeedbackView } from "../components/Feedback";
import type { Feedback, TaskProps } from "../types";

interface Item {
  id: string;
  prompt?: string;
  follow_up?: string;
  url?: string;
}

type Phase = "prep" | "part1" | "part2" | "grading" | "done";

const LEVEL_SCORE: Record<string, number> = { A1: 0, A2: 0.2, B1: 0.4, B2: 0.6, C1: 0.8, C2: 1 };

function wordCount(text: string) {
  return (text.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) ?? []).length;
}

function Editor({ value, onChange, disabled }: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <textarea className="answer-box" value={value} onChange={(e) => onChange(e.target.value)}
        disabled={disabled} placeholder="Your response" spellCheck={false} autoFocus
        onPaste={(e) => e.preventDefault()} />
      <div className="muted right">{wordCount(value)} words</div>
    </div>
  );
}

export default function WritingTask({ task, onDone }: TaskProps) {
  const [item, setItem] = useState<Item>();
  const [phase, setPhase] = useState<Phase>(task.prep_seconds ? "prep" : "part1");
  const [part1, setPart1] = useState("");
  const [part2, setPart2] = useState("");
  const [feedback, setFeedback] = useState<Feedback>();
  const [error, setError] = useState<string>();
  const twoParts = task.key === "interactive_writing";

  useEffect(() => {
    fetchItem<Item>(task.key).then(setItem, (e) => setError(e.message));
  }, [task.key]);

  const grade = (p1: string, p2: string) => {
    setPhase("grading");
    api.post<Feedback>("/api/feedback/writing", {
      task: task.key, item_id: item!.id, answer: p1, answer_part2: twoParts ? p2 : null,
    }).then((f) => {
      setFeedback(f);
      setPhase("done");
      onDone(f.ai ? LEVEL_SCORE[f.ai.overall_level] ?? null : null);
    }, (e) => setError(e.message));
  };

  const finishPart1 = () => (twoParts ? setPhase("part2") : grade(part1, ""));

  const prep = useCountdown(task.prep_seconds, !!item && phase === "prep", () => setPhase("part1"));
  const p1 = useCountdown(task.time_seconds, phase === "part1", finishPart1);
  const p2 = useCountdown(task.part2_seconds ?? 0, phase === "part2", () => grade(part1, part2));

  if (error) return <div className="notice">{error}</div>;
  if (!item) return <p className="muted">Loading…</p>;

  const question = (
    <div className="question">
      {item.url ? <img className="photo" src={item.url} alt="Describe this photo" /> : <p>{item.prompt}</p>}
    </div>
  );

  if (phase === "prep") {
    return (
      <div className="center-stack">
        <Timer left={prep.left} total={task.prep_seconds} label="Preparation" />
        <p className="prompt-label">Prepare to write about the topic below.</p>
        {question}
        <button onClick={() => setPhase("part1")}>Start writing</button>
      </div>
    );
  }
  if (phase === "part1" || phase === "part2") {
    const isPart2 = phase === "part2";
    return (
      <div>
        <Timer left={isPart2 ? p2.left : p1.left}
          total={isPart2 ? task.part2_seconds ?? 0 : task.time_seconds}
          label={twoParts ? (isPart2 ? "Part 2" : "Part 1") : undefined} />
        <p className="prompt-label">
          {item.url ? "Write one or more sentences that describe the image." : "Write about the topic below."}
        </p>
        {isPart2 ? (
          <>
            <details className="muted"><summary>Your Part 1 answer</summary><p>{part1}</p></details>
            <div className="question"><p>{item.follow_up}</p></div>
            <Editor key="p2" value={part2} onChange={setPart2} />
          </>
        ) : (
          <>
            {question}
            <Editor key="p1" value={part1} onChange={setPart1} />
          </>
        )}
        <button onClick={isPart2 ? () => grade(part1, part2) : finishPart1}>Continue</button>
      </div>
    );
  }
  if (phase === "grading") {
    return (
      <div className="center-stack">
        <div className="spinner" />
        <p>The local AI is reading your answer. This can take a minute on a laptop…</p>
      </div>
    );
  }
  return (
    <div>
      {question}
      <h3>Your answer</h3>
      <p className="your-answer">{part1 || <em>(empty)</em>}</p>
      {twoParts && (
        <>
          <div className="question"><p>{item.follow_up}</p></div>
          <p className="your-answer">{part2 || <em>(empty)</em>}</p>
        </>
      )}
      {feedback && <FeedbackView feedback={feedback} />}
    </div>
  );
}

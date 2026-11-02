import { useEffect, useState } from "react";
import { api, fetchItem } from "../api";
import { useCountdown } from "../hooks";
import { Timer } from "../components/Timer";
import { FeedbackView, feedbackScore } from "../components/Feedback";
import type { Feedback, Task, TaskProps } from "../types";

interface Item {
  id: string;
  prompt?: string;
  follow_up?: string;
  url?: string;
  bullets?: string[];
  context?: string;
  question?: string;
  options?: { key: string; text: string }[];
}

type Phase = "prep" | "part1" | "part2" | "grading" | "done";

function wordCount(text: string) {
  return (text.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) ?? []).length;
}

function WordCounter({ text, range }: { text: string; range?: [number, number] }) {
  const count = wordCount(text);
  if (!range) return <div className="muted right">{count} words</div>;
  const [low, high] = range;
  const state = count < low ? "under" : count > high ? "over" : "ok";
  return (
    <div className={`word-target ${state}`}>
      {count} words · target {low}–{high}
      {state === "over" && " (too long)"}
    </div>
  );
}

function Editor({ task, value, onChange, disabled, placeholder }: {
  task: Task;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <textarea className="answer-box" value={value} onChange={(e) => onChange(e.target.value)}
        disabled={disabled} placeholder={placeholder ?? "Your response"} autoFocus
        spellCheck={task.spellcheck ?? false}
        // The DET has no copy and paste; CELPIP's editor does.
        onPaste={task.exam === "det" ? (e) => e.preventDefault() : undefined} />
      <WordCounter text={value} range={task.word_range} />
    </div>
  );
}

function Question({ item, choice, onChoose, locked }: {
  item: Item;
  choice?: string;
  onChoose?: (key: string) => void;
  locked?: boolean;
}) {
  if (item.url) return <div className="question"><img className="photo" src={item.url} alt="Describe this photo" /></div>;
  return (
    <div className="question">
      {item.context && <p>{item.context}</p>}
      {item.prompt && <p>{item.prompt}</p>}
      {item.bullets && (
        <>
          <p className="muted small">In your email, do the following:</p>
          <ul>{item.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
        </>
      )}
      {item.question && <p className="survey-question">{item.question}</p>}
      {item.options && (
        <div className="survey-options" role="radiogroup">
          {item.options.map((o) => (
            <label key={o.key} className={`survey-option ${choice === o.key ? "chosen" : ""}`}>
              <input type="radio" name="survey" value={o.key} checked={choice === o.key}
                disabled={locked} onChange={() => onChoose?.(o.key)} />
              <strong>Option {o.key}:</strong> {o.text}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function WritingTask({ task, onDone }: TaskProps) {
  const [item, setItem] = useState<Item>();
  const [phase, setPhase] = useState<Phase>(task.prep_seconds ? "prep" : "part1");
  const [part1, setPart1] = useState("");
  const [part2, setPart2] = useState("");
  const [choice, setChoice] = useState<string>();
  const [feedback, setFeedback] = useState<Feedback>();
  const [error, setError] = useState<string>();
  const twoParts = task.key === "interactive_writing";
  const survey = !!item?.options;

  useEffect(() => {
    fetchItem<Item>(task.key).then(setItem, (e) => setError(e.message));
  }, [task.key]);

  const grade = (p1: string, p2: string) => {
    setPhase("grading");
    api.post<Feedback>("/api/feedback/writing", {
      task: task.key, item_id: item!.id, answer: p1, answer_part2: twoParts ? p2 : null, choice: choice ?? null,
    }).then((f) => {
      setFeedback(f);
      setPhase("done");
      onDone(feedbackScore(f));
    }, (e) => setError(e.message));
  };

  const finishPart1 = () => (twoParts ? setPhase("part2") : grade(part1, ""));

  const prep = useCountdown(task.prep_seconds, !!item && phase === "prep", () => setPhase("part1"));
  const p1 = useCountdown(task.time_seconds, !!item && phase === "part1", finishPart1);
  const p2 = useCountdown(task.part2_seconds ?? 0, phase === "part2", () => grade(part1, part2));

  if (error) return <div className="notice">{error}</div>;
  if (!item) return <p className="muted">Loading…</p>;

  if (phase === "prep") {
    return (
      <div className="center-stack">
        <Timer left={prep.left} total={task.prep_seconds} label="Preparation" />
        <p className="prompt-label">Prepare to write about the topic below.</p>
        <Question item={item} />
        <button onClick={() => setPhase("part1")}>Start writing</button>
      </div>
    );
  }
  if (phase === "part1" || phase === "part2") {
    const isPart2 = phase === "part2";
    const label = item.url ? "Write one or more sentences that describe the image."
      : item.bullets ? "Write an email of 150–200 words."
      : survey ? "Choose the option you prefer, then explain why in 150–200 words."
      : "Write about the topic below.";
    return (
      <div>
        <Timer left={isPart2 ? p2.left : p1.left}
          total={isPart2 ? task.part2_seconds ?? 0 : task.time_seconds}
          label={twoParts ? (isPart2 ? "Part 2" : "Part 1") : undefined} />
        <p className="prompt-label">{label}</p>
        {isPart2 ? (
          <>
            <details className="muted"><summary>Your Part 1 answer</summary><p>{part1}</p></details>
            <div className="question"><p>{item.follow_up}</p></div>
            <Editor key="p2" task={task} value={part2} onChange={setPart2} />
          </>
        ) : (
          <>
            <Question item={item} choice={choice} onChoose={setChoice} />
            <Editor key="p1" task={task} value={part1} onChange={setPart1}
              disabled={survey && !choice}
              placeholder={survey && !choice ? "Choose Option A or B first" : undefined} />
          </>
        )}
        <button onClick={isPart2 ? () => grade(part1, part2) : finishPart1}>
          {twoParts && !isPart2 ? "Continue" : "Submit"}
        </button>
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
      <Question item={item} choice={choice} locked />
      <h3>Your answer</h3>
      <p className="your-answer">{part1 || <em>(empty)</em>}</p>
      <WordCounter text={part1} range={task.word_range} />
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

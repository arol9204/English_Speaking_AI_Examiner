import { Fragment, useEffect, useRef, useState } from "react";
import { api, fetchItem } from "../api";
import { useCountdown } from "../hooks";
import { Timer } from "../components/Timer";
import { ScoreBanner } from "../components/Result";
import { Explanation, MultipleChoice } from "../components/Choices";
import type { CheckResult, ChoiceQuestion, TaskProps } from "../types";

type Passage =
  | { type: "text"; title?: string; meta?: string[]; paragraphs: string[] }
  | { type: "diagram"; title: string; columns: string[]; rows: string[][]; notes?: string[] }
  | { type: "labeled"; title: string; paragraphs: { label: string; text: string }[] };

interface QuestionGroup {
  type: "mcq" | "cloze" | "match";
  intro: string;
  meta?: string[];
  text?: string;
  options?: string[];
  option_labels?: Record<string, string>;
  questions: ChoiceQuestion[];
}

interface Item {
  id: string;
  title: string;
  instructions: string;
  passage: Passage;
  tasks: QuestionGroup[];
}

type Answers = Record<string, number | null>;
type Results = Record<string, CheckResult["results"][number]>;

function EmailHeader({ lines }: { lines: string[] }) {
  return (
    <div className="email-header">
      {lines.map((line) => {
        const [label, ...rest] = line.split(": ");
        return rest.length ? (
          <div key={line}><span className="muted">{label}:</span> {rest.join(": ")}</div>
        ) : <div key={line}>{line}</div>;
      })}
    </div>
  );
}

function PassageView({ passage }: { passage: Passage }) {
  if (passage.type === "diagram") {
    return (
      <figure className="diagram">
        <figcaption>{passage.title}</figcaption>
        <div className="table-scroll">
          <table>
            <thead><tr>{passage.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>
              {passage.rows.map((row, i) => (
                <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
        {passage.notes && <ul className="diagram-notes">{passage.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
      </figure>
    );
  }
  if (passage.type === "labeled") {
    return (
      <article className="article">
        <h3>{passage.title}</h3>
        {passage.paragraphs.map((p) => (
          <p key={p.label} className="labeled-paragraph">
            <span className="paragraph-label">{p.label}</span>{p.text}
          </p>
        ))}
      </article>
    );
  }
  return (
    <article className="article">
      {passage.meta && <EmailHeader lines={passage.meta} />}
      {passage.title && <h3>{passage.title}</h3>}
      {passage.paragraphs.map((p, i) => <p key={i} className="keep-lines">{p}</p>)}
    </article>
  );
}

function Cloze({ group, answers, results, onChange }: {
  group: QuestionGroup;
  answers: Answers;
  results?: Results;
  onChange: (id: string, value: number) => void;
}) {
  const byId = Object.fromEntries(group.questions.map((q) => [q.id, q]));
  return (
    <div className="cloze">
      {group.meta && <EmailHeader lines={group.meta} />}
      {group.text!.split("\n\n").map((paragraph, p) => (
        <p key={p} className="keep-lines">
          {paragraph.split(/(\{\{\w+\}\})/).map((part, i) => {
            const id = part.match(/^\{\{(\w+)\}\}$/)?.[1];
            if (!id) return <Fragment key={i}>{part}</Fragment>;
            const r = results?.[id];
            return (
              <select key={i} className={`blank ${r ? (r.correct ? "ok" : "wrong") : ""}`}
                aria-label={`Blank ${id}`} value={answers[id] ?? ""} disabled={!!results}
                onChange={(e) => onChange(id, Number(e.target.value))}>
                <option value="" disabled>{id}. Choose…</option>
                {byId[id].options!.map((o, j) => <option key={j} value={j}>{o}</option>)}
              </select>
            );
          })}
        </p>
      ))}
      {results && (
        <ol className="blank-review">
          {group.questions.map((q) => (
            <li key={q.id} value={Number(q.id)}>
              <Explanation result={results[q.id]} options={q.options!} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Matching({ group, answers, results, onChange }: {
  group: QuestionGroup;
  answers: Answers;
  results?: Results;
  onChange: (id: string, value: number) => void;
}) {
  const label = (o: string) => (group.option_labels?.[o] ? `${o}: ${group.option_labels[o]}` : o);
  // Keep the dropdown narrow: "E (not given)" instead of the full sentence.
  const shortLabel = (o: string) => {
    const words = group.option_labels?.[o]?.split(" ").slice(0, 2).join(" ").toLowerCase();
    return words ? `${o} (${words})` : o;
  };
  return (
    <div className="matching">
      {group.questions.map((q) => {
        const r = results?.[q.id];
        return (
          <div key={q.id} className="match-row">
            <span className="q-number">{q.id}.</span>
            <span className="match-statement">{q.prompt}</span>
            <select className={`blank ${r ? (r.correct ? "ok" : "wrong") : ""}`} aria-label={`Statement ${q.id}`}
              value={answers[q.id] ?? ""} disabled={!!results}
              onChange={(e) => onChange(q.id, Number(e.target.value))}>
              <option value="" disabled>Choose…</option>
              {group.options!.map((o, j) => <option key={o} value={j}>{shortLabel(o)}</option>)}
            </select>
            {r && <div className="match-explain"><Explanation result={r} options={group.options!.map(label)} /></div>}
          </div>
        );
      })}
    </div>
  );
}

export default function ReadingPart({ task, onDone }: TaskProps) {
  const [item, setItem] = useState<Item>();
  const [answers, setAnswers] = useState<Answers>({});
  const [result, setResult] = useState<CheckResult>();
  const [error, setError] = useState<string>();
  const submitted = useRef(false);

  useEffect(() => {
    fetchItem<Item>(task.key).then(setItem, (e) => setError(e.message));
  }, [task.key]);

  const choose = (id: string, value: number) => setAnswers((old) => ({ ...old, [id]: value }));

  const submit = () => {
    if (!item || submitted.current) return;
    submitted.current = true;
    api.post<CheckResult>(`/api/check/${task.key}`, { item_id: item.id, answers }).then((r) => {
      setResult(r);
      onDone(r.score);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, (e) => setError(e.message));
  };

  const { left } = useCountdown(task.time_seconds, !!item && !result, submit);

  if (error) return <div className="notice">{error}</div>;
  if (!item) return <p className="muted">Loading…</p>;

  const results: Results | undefined = result && Object.fromEntries(result.results.map((r) => [r.id, r]));
  const answered = Object.values(answers).filter((v) => v !== null).length;

  return (
    <div>
      {result ? (
        <ScoreBanner score={result.score} label={`${result.correct} of ${result.total} correct`} />
      ) : (
        <Timer left={left} total={task.time_seconds} />
      )}
      <div className="reading-layout">
        <section className="passage-panel" aria-label="Reading passage">
          <p className="muted small">{item.instructions}</p>
          <PassageView passage={item.passage} />
        </section>
        <section className="questions-panel" aria-label="Questions">
          {item.tasks.map((group, g) => (
            <div key={g} className="question-group">
              <p className="prompt-label">{group.intro}</p>
              {group.type === "mcq" && group.questions.map((q) => (
                <MultipleChoice key={q.id} question={q} value={answers[q.id] ?? null}
                  result={results?.[q.id]} onChange={(v) => choose(q.id, v)} />
              ))}
              {group.type === "cloze" && <Cloze group={group} answers={answers} results={results} onChange={choose} />}
              {group.type === "match" && <Matching group={group} answers={answers} results={results} onChange={choose} />}
            </div>
          ))}
          {!result && (
            <div className="row">
              <button onClick={submit}>Submit answers</button>
              <span className="muted small">{answered} of {task.question_count} answered</span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

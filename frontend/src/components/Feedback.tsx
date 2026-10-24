import { useState } from "react";
import type { Feedback } from "../types";

const CRITERIA_NAMES: Record<string, string> = {
  content: "Content",
  coherence: "Discourse coherence",
  grammar: "Grammar",
  lexis: "Lexis (vocabulary)",
  fluency: "Fluency",
  pronunciation: "Pronunciation",
};

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

function LevelBadge({ level }: { level: string }) {
  const rank = LEVELS.indexOf(level);
  return <span className={`level level-${rank}`}>{level}</span>;
}

function CopyForClaude({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this text:", prompt);
    }
  };
  return (
    <div className="claude-box">
      <button className="secondary" onClick={copy}>
        {copied ? "Copied!" : "Copy for Claude"}
      </button>
      <span className="muted">
        Paste it into a chat at claude.ai to get a second opinion from Claude.
      </span>
    </div>
  );
}

export function FeedbackView({ feedback }: { feedback: Feedback }) {
  const ai = feedback.ai;
  return (
    <div className="feedback">
      {ai ? (
        <>
          <div className="overall">
            <span>Estimated level</span>
            <LevelBadge level={ai.overall_level} />
          </div>
          <table className="criteria">
            <tbody>
              {Object.entries(ai.criteria).map(([name, c]) => (
                <tr key={name}>
                  <th>{CRITERIA_NAMES[name] ?? name}</th>
                  <td>
                    <LevelBadge level={c.level} />
                  </td>
                  <td>{c.comment}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="columns">
            <section>
              <h3>Strengths</h3>
              <ul>{ai.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </section>
            <section>
              <h3>What to improve</h3>
              <ul>{ai.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </section>
          </div>
          {ai.corrections.length > 0 && (
            <section>
              <h3>Corrections</h3>
              <ul className="corrections">
                {ai.corrections.map((c, i) => (
                  <li key={i}>
                    <del>{c.original}</del> → <ins>{c.corrected}</ins>
                    <div className="muted">{c.explanation}</div>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section>
            <h3>Improved answer</h3>
            <p className="improved">{ai.improved_answer}</p>
          </section>
        </>
      ) : (
        <div className="notice">
          <strong>No AI feedback.</strong> {feedback.ai_error}
          <div className="muted">
            Install Ollama for free local feedback (see the README), or use the button below.
          </div>
        </div>
      )}
      <details>
        <summary>Measurements</summary>
        <pre>{JSON.stringify(feedback.metrics, null, 2)}</pre>
      </details>
      <CopyForClaude prompt={feedback.claude_prompt} />
      <p className="muted small">
        Levels are an estimate from a local AI model, not an official DET score.
      </p>
    </div>
  );
}

import { useState } from "react";
import type { Feedback } from "../types";

/** The overall level as a 0-1 score for the practice history (null when there is no AI grade). */
export function feedbackScore(feedback: Feedback): number | null {
  const levels = feedback.scale.levels;
  const rank = feedback.ai ? levels.indexOf(feedback.ai.overall_level) : -1;
  return rank < 0 ? null : rank / (levels.length - 1);
}

function LevelBadge({ level, levels }: { level: string; levels: string[] }) {
  const rank = levels.indexOf(level);
  // Six colour steps from weak (red) to strong (blue), whatever the scale.
  const step = rank < 0 ? 0 : Math.round((rank / (levels.length - 1)) * 5);
  return <span className={`level level-${step}`}>{level}</span>;
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
  const levels = feedback.scale.levels;
  return (
    <div className="feedback">
      {ai ? (
        <>
          <div className="overall">
            <span>Estimated {feedback.scale.name}</span>
            <LevelBadge level={ai.overall_level} levels={levels} />
          </div>
          <table className="criteria">
            <tbody>
              {Object.entries(ai.criteria).map(([name, c]) => (
                <tr key={name}>
                  <th>{feedback.criteria_names[name] ?? name}</th>
                  <td>
                    <LevelBadge level={c.level} levels={levels} />
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
            Install Ollama for free local feedback (see the setup guide), or use the button below.
          </div>
        </div>
      )}
      <details>
        <summary>Measurements</summary>
        <pre>{JSON.stringify(feedback.metrics, null, 2)}</pre>
      </details>
      <CopyForClaude prompt={feedback.claude_prompt} />
      <p className="muted small">
        Levels are an estimate from a local AI model, not an official test score.
      </p>
    </div>
  );
}

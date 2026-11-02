import type { CheckResult, ChoiceQuestion } from "../types";

type Result = CheckResult["results"][number];

/** After checking: whether the answer was right, the right option, and why. */
export function Explanation({ result, options }: { result: Result; options: string[] }) {
  return (
    <div className={`explain ${result.correct ? "ok" : "wrong"}`}>
      <strong>{result.correct ? "✓ Correct." : `✗ Answer: ${options[result.answer].replace(/[.!?]$/, "")}.`}</strong>{" "}
      {result.explanation}
    </div>
  );
}

/** A question with four options, answered with radio buttons. */
export function MultipleChoice({ question, value, result, onChange, autoFocus }: {
  question: ChoiceQuestion;
  value: number | null;
  result?: Result;
  onChange: (value: number) => void;
  autoFocus?: boolean;
}) {
  const name = `q-${question.id}`;
  return (
    <fieldset className="mcq">
      <legend><span className="q-number">{question.id}.</span> {question.prompt}</legend>
      {question.options!.map((option, i) => {
        const state = result ? (i === result.answer ? "right" : i === value ? "chosen-wrong" : "") : "";
        return (
          <label key={i} className={`mcq-option ${value === i ? "selected" : ""} ${state}`}>
            <input type="radio" name={name} checked={value === i} disabled={!!result}
              autoFocus={autoFocus && i === 0} onChange={() => onChange(i)} />
            {option}
          </label>
        );
      })}
      {result && <Explanation result={result} options={question.options!} />}
    </fieldset>
  );
}

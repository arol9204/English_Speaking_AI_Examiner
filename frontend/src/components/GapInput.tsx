import type { Gap } from "../types";

/** A word with its visible first half and a box for the missing letters. */
export function GapInput({ gap, value, onChange, disabled, state, autoFocus, onEnter }: {
  gap: Pick<Gap, "prefix" | "missing_length">;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  state?: "ok" | "wrong";
  autoFocus?: boolean;
  onEnter?: () => void;
}) {
  return (
    <span className={`gap ${state ?? ""}`}>
      {gap.prefix}
      <input
        className="gap-input"
        style={{ width: `${gap.missing_length + 0.6}ch` }}
        maxLength={gap.missing_length}
        placeholder={"_".repeat(gap.missing_length)}
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        onChange={(e) => onChange(e.target.value.replace(/[^A-Za-z]/g, ""))}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
      />
    </span>
  );
}

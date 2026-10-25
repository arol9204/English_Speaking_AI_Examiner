export function formatTime(seconds: number) {
  const s = Math.ceil(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function Timer({ left, total, label, recording }: {
  left: number;
  total: number;
  label?: string;
  recording?: boolean;
}) {
  const ratio = total ? left / total : 0;
  const urgent = left <= Math.min(10, total * 0.2);
  return (
    <div className={`timer ${urgent ? "urgent" : ""}`} role="timer" aria-live="off">
      {label && <span className={`timer-label ${recording ? "rec" : ""}`}>{label}</span>}
      <span className="timer-value">{formatTime(left)}</span>
      <div className="timer-track">
        <div className="timer-fill" style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}

export function ScoreBanner({ score, label }: { score: number; label?: string }) {
  const pct = Math.round(score * 100);
  const tone = pct >= 80 ? "good" : pct >= 50 ? "ok" : "bad";
  return (
    <div className={`score-banner ${tone}`}>
      <span className="score-value">{pct}%</span>
      {label && <span>{label}</span>}
    </div>
  );
}

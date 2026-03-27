import { scoreColor, fmtScore } from '../utils';

interface ScoreBarProps {
  label: string;
  score: number | null;
}

export function ScoreBar({ label, score }: ScoreBarProps) {
  const pct = score !== null ? Math.round(score * 100) : 0;
  const color =
    score === null
      ? 'bg-muted'
      : score >= 0.8
        ? 'bg-green-500'
        : score >= 0.6
          ? 'bg-orange-500'
          : 'bg-red-500';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={scoreColor(score)}>{fmtScore(score)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface IndexingBannerProps {
  indexed: number;
  total: number;
  progress: number;
}

export function IndexingBanner({ indexed, total, progress }: IndexingBannerProps) {
  if (total === 0 || indexed === total) return null;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
      <span className="shrink-0 text-sm text-blue-400">
        Indexation en cours — {indexed}/{total} doc{total > 1 ? 's' : ''} · {Math.round(progress)}%
      </span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-blue-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}j ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatDateFR(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function userInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.split(' ');
    return parts.length >= 2
      ? `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function scoreColor(score: number | null): string {
  if (score === null) return 'text-muted-foreground';
  if (score >= 0.8) return 'text-green-500';
  if (score >= 0.6) return 'text-orange-500';
  return 'text-red-500';
}

export function fmtScore(score: number | null): string {
  if (score === null) return '\u2014';
  return score.toFixed(2);
}

export function fmtDelta(
  current: number | null,
  previous: number | null,
  lowerIsBetter = false
): { text: string; color: string } | null {
  if (current === null || previous === null) return null;
  const delta = current - previous;
  if (Math.abs(delta) < 0.001) return { text: '\u2014', color: 'text-muted-foreground' };
  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  const sign = delta > 0 ? '+' : '';
  const text = lowerIsBetter
    ? `${delta > 0 ? '+' : ''}${Math.round(delta)}ms`
    : `${sign}${delta.toFixed(2)}`;
  return { text, color: improved ? 'text-green-500' : 'text-red-500' };
}

export function formatRunDate(runId: string): string {
  const normalized = runId.replace(/T(\d{2})-(\d{2})-(\d{2})$/, 'T$1:$2:$3');
  try {
    return new Date(normalized).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return runId;
  }
}

import { Skeleton } from '@corpusai/ui';

export function AnalyticsTabSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-56" />
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
      <ChartsSkeleton />
    </div>
  );
}

export function ChartsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[340px] w-full rounded-xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-[240px] w-full rounded-xl" />
        <Skeleton className="h-[240px] w-full rounded-xl" />
      </div>
    </div>
  );
}

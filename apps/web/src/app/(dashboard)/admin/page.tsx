'use client';

import * as React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Input,
  Skeleton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@corpusai/ui';
import {
  useAdminDashboard,
  useAdminUsers,
  useAdminAIs,
  useUpdateUserRole,
  useUpdateUserPlan,
  useEvalReports,
  useEvalReport,
  useEvalDatasets,
  useRunEval,
  type EvalReportSummary,
  type EvalSummary,
} from '@/lib/queries';
import { UsersIcon, BotIcon, FileIcon, MessageIcon, SearchIcon, ShieldIcon } from '@/lib/icons';
import { PageWrapper } from '@/components/page-wrapper';

const PLAN_COLORS: Record<string, string> = {
  FREE: 'secondary',
  CREATOR: 'default',
  PRO: 'default',
  ENTERPRISE: 'default',
};

const STATUS_COLORS: Record<string, 'secondary' | 'destructive' | 'default'> = {
  ACTIVE: 'secondary',
  CANCELED: 'destructive',
  PAST_DUE: 'destructive',
  TRIALING: 'default',
};

// ─── Eval helpers ─────────────────────────────────────────────────────────────

const REFUSAL_PHRASE = 'Je ne trouve pas cette information dans les documents disponibles';

function scoreColor(score: number | null): string {
  if (score === null) return 'text-muted-foreground';
  if (score >= 0.8) return 'text-green-500';
  if (score >= 0.6) return 'text-orange-500';
  return 'text-red-500';
}

function fmtScore(score: number | null): string {
  if (score === null) return '—';
  return score.toFixed(2);
}

function fmtDelta(
  current: number | null,
  previous: number | null,
  lowerIsBetter = false
): { text: string; color: string } | null {
  if (current === null || previous === null) return null;
  const delta = current - previous;
  if (Math.abs(delta) < 0.001) return { text: '—', color: 'text-muted-foreground' };
  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  const sign = delta > 0 ? '+' : '';
  const text = lowerIsBetter
    ? `${delta > 0 ? '+' : ''}${Math.round(delta)}ms`
    : `${sign}${delta.toFixed(2)}`;
  return { text, color: improved ? 'text-green-500' : 'text-red-500' };
}

function formatRunDate(runId: string): string {
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

// ─── Eval sub-components ──────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  delta,
  unit = '',
}: {
  label: string;
  value: number | null;
  delta: { text: string; color: string } | null;
  unit?: string;
}) {
  return (
    <Card variant="glass">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">
          {value !== null ? `${value.toFixed(unit === 'ms' ? 0 : 2)}${unit}` : '—'}
        </p>
        {delta && <p className={`mt-0.5 text-xs font-medium ${delta.color}`}>{delta.text}</p>}
      </CardContent>
    </Card>
  );
}

function ScoreBar({ label, score }: { label: string; score: number | null }) {
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

function RunEvalModal({
  slug: defaultSlug,
  open,
  onOpenChange,
}: {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: datasets } = useEvalDatasets();
  const { mutate: runEval, isPending, isSuccess, error } = useRunEval();
  const [selectedDataset, setSelectedDataset] = React.useState('');
  const [selectedSlug, setSelectedSlug] = React.useState(defaultSlug);

  React.useEffect(() => {
    if (datasets?.length && !selectedDataset) setSelectedDataset(datasets[0]!);
  }, [datasets, selectedDataset]);

  React.useEffect(() => {
    if (isSuccess) {
      const t = setTimeout(() => onOpenChange(false), 1500);
      return () => clearTimeout(t);
    }
  }, [isSuccess, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Lancer un run d'évaluation</DialogTitle>
          <DialogDescription>Sélectionne l'AI et le dataset à évaluer.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">AI Slug</label>
            <Input
              value={selectedSlug}
              onChange={(e) => setSelectedSlug(e.target.value)}
              placeholder="ex: marketing-digital"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Dataset</label>
            <Select value={selectedDataset} onValueChange={setSelectedDataset}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un dataset..." />
              </SelectTrigger>
              <SelectContent>
                {datasets?.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isPending && (
            <p className="text-xs text-muted-foreground">
              Évaluation en cours... (peut prendre 2-3 minutes)
            </p>
          )}
          {error && (
            <p className="text-xs text-red-500">
              Erreur : {error instanceof Error ? error.message : String(error)}
            </p>
          )}
          {isSuccess && <p className="text-xs text-green-500">Run terminé, rapport enregistré.</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
              Fermer
            </Button>
            <Button
              disabled={isPending || !selectedSlug || !selectedDataset}
              onClick={() => runEval({ slug: selectedSlug, dataset: selectedDataset })}
            >
              {isPending ? 'En cours...' : 'Lancer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EvalTab() {
  const { data: allReports, isLoading } = useEvalReports();
  const [selectedSlug, setSelectedSlug] = React.useState<string>('');
  const [showRunEvalModal, setShowRunEvalModal] = React.useState(false);

  const slugs = React.useMemo(() => {
    if (!allReports) return [];
    return [...new Set(allReports.map((r) => r.aiSlug))].sort();
  }, [allReports]);

  React.useEffect(() => {
    if (slugs.length > 0 && !selectedSlug) setSelectedSlug(slugs[0]!);
  }, [slugs, selectedSlug]);

  const slugReports: EvalReportSummary[] = React.useMemo(() => {
    if (!allReports || !selectedSlug) return [];
    return allReports.filter((r) => r.aiSlug === selectedSlug);
  }, [allReports, selectedSlug]);

  const currentReport = slugReports[0] ?? null;
  const prevReport = slugReports[1] ?? null;
  const { data: fullReport } = useEvalReport(currentReport?.runId ?? '');

  const current: EvalSummary | undefined = currentReport?.summary;
  const prev: EvalSummary | undefined = prevReport?.summary;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!allReports || allReports.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowRunEvalModal(true)}>
            Lancer un run
          </Button>
        </div>
        <Card variant="glass">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-muted-foreground">Aucun rapport disponible.</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Lance le script d'évaluation depuis <code className="text-xs">scripts/eval/</code>{' '}
              pour générer ton premier rapport.
            </p>
          </CardContent>
        </Card>
        <RunEvalModal
          slug="your-ai-slug"
          open={showRunEvalModal}
          onOpenChange={setShowRunEvalModal}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {currentReport && (
            <p className="text-sm text-muted-foreground">
              {formatRunDate(currentReport.runId)} · {currentReport.resultsCount} questions
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedSlug} onValueChange={setSelectedSlug}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Choisir un AI..." />
            </SelectTrigger>
            <SelectContent>
              {slugs.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setShowRunEvalModal(true)}>
            Lancer un run
          </Button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard
          label="Faithfulness"
          value={current?.faithfulness ?? null}
          delta={fmtDelta(current?.faithfulness ?? null, prev?.faithfulness ?? null)}
        />
        <MetricCard
          label="Answer Relevancy"
          value={current?.answer_relevancy ?? null}
          delta={fmtDelta(current?.answer_relevancy ?? null, prev?.answer_relevancy ?? null)}
        />
        <MetricCard
          label="Context Recall"
          value={current?.context_recall ?? null}
          delta={fmtDelta(current?.context_recall ?? null, prev?.context_recall ?? null)}
        />
        <MetricCard
          label="Latence moyenne"
          value={current?.avgLatencyMs ?? null}
          unit="ms"
          delta={fmtDelta(current?.avgLatencyMs ?? null, prev?.avgLatencyMs ?? null, true)}
        />
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Détail par question
          </h2>
          {fullReport ? (
            fullReport.results.map((result, idx) => {
              const { faithfulness: f, answer_relevancy: r, context_recall: c } = result.metrics;
              const isRefusal = result.answer.includes(REFUSAL_PHRASE);
              return (
                <Card key={idx} variant="glass">
                  <CardContent className="space-y-2 p-4">
                    <p className="line-clamp-2 text-sm font-medium">{result.question}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`font-mono text-xs ${scoreColor(f)}`}>
                        faithful {fmtScore(f)}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className={`font-mono text-xs ${scoreColor(r)}`}>
                        relevant {fmtScore(r)}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className={`font-mono text-xs ${scoreColor(c)}`}>
                        recall {fmtScore(c)}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{result.latencyMs}ms</span>
                      {isRefusal && (
                        <Badge variant="secondary" className="text-[10px]">
                          refus correct
                        </Badge>
                      )}
                      {result.error && (
                        <Badge variant="destructive" className="text-[10px]">
                          erreur
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-12 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-sm">Scores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScoreBar label="Faithfulness" score={current?.faithfulness ?? null} />
              <ScoreBar label="Answer Relevancy" score={current?.answer_relevancy ?? null} />
              <ScoreBar label="Context Recall" score={current?.context_recall ?? null} />
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-sm">Historique des runs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {slugReports.slice(0, 3).map((report, idx) => (
                <div
                  key={report.runId}
                  className={`rounded-md p-2 text-xs ${idx === 0 ? 'border border-primary/20 bg-primary/10' : 'bg-muted/30'}`}
                >
                  <p className="font-medium text-muted-foreground">
                    {formatRunDate(report.runId)}
                    {idx === 0 && <span className="ml-2 font-semibold text-primary">current</span>}
                  </p>
                  <div className="mt-1 flex gap-3 font-mono">
                    <span className={scoreColor(report.summary.faithfulness)}>
                      F {fmtScore(report.summary.faithfulness)}
                    </span>
                    <span className={scoreColor(report.summary.answer_relevancy)}>
                      R {fmtScore(report.summary.answer_relevancy)}
                    </span>
                    <span className={scoreColor(report.summary.context_recall)}>
                      C {fmtScore(report.summary.context_recall)}
                    </span>
                  </div>
                </div>
              ))}
              {slugReports.length === 0 && (
                <p className="text-xs text-muted-foreground">Aucun run pour ce slug.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <RunEvalModal
        slug={selectedSlug}
        open={showRunEvalModal}
        onOpenChange={setShowRunEvalModal}
      />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [activeTab, setActiveTab] = React.useState<'overview' | 'users' | 'ais' | 'eval'>(
    'overview'
  );
  const [userSearch, setUserSearch] = React.useState('');
  const [aiSearch, setAiSearch] = React.useState('');
  const [userPage, setUserPage] = React.useState(1);
  const [aiPage, setAiPage] = React.useState(1);

  const { data: dashboard, isLoading: dashLoading } = useAdminDashboard();
  const { data: usersData, isLoading: usersLoading } = useAdminUsers(
    userPage,
    userSearch || undefined
  );
  const { data: aisData, isLoading: aisLoading } = useAdminAIs(aiPage, aiSearch || undefined);
  const updateRole = useUpdateUserRole();
  const updatePlan = useUpdateUserPlan();

  if (dashLoading) {
    return (
      <PageWrapper className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldIcon className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Administration</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['overview', 'users', 'ais', 'eval'] as const).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'overview'
              ? 'Vue globale'
              : tab === 'users'
                ? 'Utilisateurs'
                : tab === 'ais'
                  ? 'AIs'
                  : 'Évaluation RAG'}
          </Button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && dashboard && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <StatCard
              icon={<UsersIcon className="h-5 w-5" />}
              label="Utilisateurs"
              value={dashboard.totals.users}
            />
            <StatCard
              icon={<BotIcon className="h-5 w-5" />}
              label="AIs"
              value={dashboard.totals.ais}
            />
            <StatCard
              icon={<FileIcon className="h-5 w-5" />}
              label="Documents"
              value={dashboard.totals.documents}
            />
            <StatCard
              icon={<MessageIcon className="h-5 w-5" />}
              label="Conversations"
              value={dashboard.totals.conversations}
            />
            <StatCard
              icon={<UsersIcon className="h-5 w-5" />}
              label="Nouveaux (7j)"
              value={dashboard.recentSignups}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Utilisateurs par plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard.usersByPlan.map((g) => (
                    <div key={g.plan} className="flex items-center justify-between">
                      <Badge
                        variant={PLAN_COLORS[g.plan] === 'secondary' ? 'secondary' : 'default'}
                      >
                        {g.plan}
                      </Badge>
                      <span className="font-mono text-sm">{g.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader>
                <CardTitle>Documents par statut</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard.documentsByStatus.map((g) => (
                    <div key={g.status} className="flex items-center justify-between">
                      <Badge variant={g.status === 'FAILED' ? 'destructive' : 'secondary'}>
                        {g.status}
                      </Badge>
                      <span className="font-mono text-sm">{g.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Users */}
      {activeTab === 'users' && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Utilisateurs</CardTitle>
            <CardDescription>Gerer les comptes et les plans.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par email ou nom..."
                className="pl-10"
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setUserPage(1);
                }}
              />
            </div>

            {usersLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {usersData?.users?.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between rounded-lg bg-muted/30 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{user.name || user.email}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={STATUS_COLORS[user.subscriptionStatus] || 'secondary'}>
                          {user.subscriptionPlan}
                        </Badge>
                        {user.role === 'ADMIN' && <Badge variant="default">Admin</Badge>}
                        <span className="text-xs text-muted-foreground">{user._count.ais} AIs</span>
                        <select
                          className="rounded border bg-background px-2 py-1 text-xs"
                          value={user.subscriptionPlan}
                          onChange={(e) =>
                            updatePlan.mutate({ userId: user.id, plan: e.target.value })
                          }
                        >
                          {['FREE', 'CREATOR', 'PRO', 'ENTERPRISE'].map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updateRole.mutate({
                              userId: user.id,
                              role: user.role === 'ADMIN' ? 'USER' : 'ADMIN',
                            })
                          }
                        >
                          {user.role === 'ADMIN' ? 'Retirer admin' : 'Promouvoir'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {usersData?.pagination && usersData.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-muted-foreground">
                      Page {usersData.pagination.page}/{usersData.pagination.totalPages} (
                      {usersData.pagination.total} total)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={userPage <= 1}
                        onClick={() => setUserPage((p) => p - 1)}
                      >
                        Precedent
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={userPage >= usersData.pagination.totalPages}
                        onClick={() => setUserPage((p) => p + 1)}
                      >
                        Suivant
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* AIs */}
      {activeTab === 'ais' && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle>AIs</CardTitle>
            <CardDescription>Tous les assistants de la plateforme.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou slug..."
                className="pl-10"
                value={aiSearch}
                onChange={(e) => {
                  setAiSearch(e.target.value);
                  setAiPage(1);
                }}
              />
            </div>

            {aisLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {aisData?.ais?.map((ai) => (
                    <div
                      key={ai.id}
                      className="flex items-center justify-between rounded-lg bg-muted/30 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{ai.name}</p>
                        <p className="text-xs text-muted-foreground">
                          /{ai.slug} — {ai.user.name || ai.user.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <Badge variant={ai.status === 'ACTIVE' ? 'secondary' : 'default'}>
                          {ai.status}
                        </Badge>
                        <span>{ai.documentCount} docs</span>
                        <span>{ai.conversationCount} convs</span>
                        <span>{ai.questionCount} Q</span>
                      </div>
                    </div>
                  ))}
                </div>

                {aisData?.pagination && aisData.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-muted-foreground">
                      Page {aisData.pagination.page}/{aisData.pagination.totalPages} (
                      {aisData.pagination.total} total)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={aiPage <= 1}
                        onClick={() => setAiPage((p) => p - 1)}
                      >
                        Precedent
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={aiPage >= aisData.pagination.totalPages}
                        onClick={() => setAiPage((p) => p + 1)}
                      >
                        Suivant
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Eval */}
      {activeTab === 'eval' && <EvalTab />}
    </PageWrapper>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card variant="glass">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
        <div>
          <p className="text-2xl font-bold">{value.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

import { Card, CardHeader, CardTitle, CardContent, Badge } from '@corpusai/ui';
import { UsersIcon, BotIcon, FileIcon, MessageIcon } from '@/lib/icons';
import type { AdminDashboard } from '@/lib/queries';
import { PLAN_COLORS } from '../constants';
import { StatCard } from './stat-card';

interface OverviewTabProps {
  dashboard: AdminDashboard;
}

export function OverviewTab({ dashboard }: OverviewTabProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard
          icon={<UsersIcon className="h-5 w-5" />}
          label="Utilisateurs"
          value={dashboard.totals.users}
        />
        <StatCard icon={<BotIcon className="h-5 w-5" />} label="AIs" value={dashboard.totals.ais} />
        <StatCard
          icon={<FileIcon className="h-5 w-5" />}
          label="Documents"
          value={dashboard.totals.documents}
          badge={
            dashboard.failedDocsRate > 0
              ? {
                  text: `${dashboard.failedDocsRate}% echoues`,
                  variant: 'destructive' as const,
                }
              : undefined
          }
        />
        <StatCard
          icon={<MessageIcon className="h-5 w-5" />}
          label="Conversations"
          value={dashboard.totals.conversations}
        />
        <StatCard
          icon={<MessageIcon className="h-5 w-5" />}
          label="Messages"
          value={dashboard.totals.messages}
        />
        <StatCard
          icon={<UsersIcon className="h-5 w-5" />}
          label="Nouveaux (7j)"
          value={dashboard.recentSignups}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card variant="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-[13px] font-semibold text-tx-primary">
              Utilisateurs par plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.usersByPlan.map((g) => (
                <div
                  key={g.plan}
                  className="flex items-center justify-between rounded-md border border-[hsl(var(--border-subtle))] bg-[hsl(var(--surface-1))] px-3 py-2"
                >
                  <Badge variant={PLAN_COLORS[g.plan] === 'secondary' ? 'secondary' : 'default'}>
                    {g.plan}
                  </Badge>
                  <span className="font-mono text-[13px] text-tx-primary">{g.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-[13px] font-semibold text-tx-primary">
              Documents par statut
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.documentsByStatus.map((g) => (
                <div
                  key={g.status}
                  className="flex items-center justify-between rounded-md border border-[hsl(var(--border-subtle))] bg-[hsl(var(--surface-1))] px-3 py-2"
                >
                  <Badge variant={g.status === 'FAILED' ? 'destructive' : 'secondary'}>
                    {g.status}
                  </Badge>
                  <span className="font-mono text-[13px] text-tx-primary">{g.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-[13px] font-semibold text-tx-primary">Top AIs</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.topAIs.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-tx-disabled">
                Aucun assistant pour le moment.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[hsl(var(--border-subtle))]">
                      <th className="pb-2 text-left text-[11px] font-medium uppercase tracking-wider text-tx-disabled">
                        Nom
                      </th>
                      <th className="pb-2 text-right text-[11px] font-medium uppercase tracking-wider text-tx-disabled">
                        Convs
                      </th>
                      <th className="pb-2 text-right text-[11px] font-medium uppercase tracking-wider text-tx-disabled">
                        Questions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.topAIs.map((ai) => (
                      <tr
                        key={ai.id}
                        className="border-b border-[hsl(var(--border-subtle))] last:border-0"
                      >
                        <td className="py-2">
                          <p className="text-[13px] font-medium text-tx-primary">{ai.name}</p>
                          <p className="text-[11px] text-tx-muted">
                            /{ai.slug} &middot; {ai.user.name || ai.user.email}
                          </p>
                        </td>
                        <td className="py-2 text-right font-mono text-[13px] text-tx-primary">
                          {ai.conversationCount}
                        </td>
                        <td className="py-2 text-right font-mono text-[13px] text-tx-primary">
                          {ai.questionCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

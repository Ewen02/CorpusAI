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
  Skeleton,
  Separator,
  Input,
} from '@corpusai/ui';
import {
  useAdminDashboard,
  useAdminUsers,
  useAdminAIs,
  useUpdateUserRole,
  useUpdateUserPlan,
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

export default function AdminPage() {
  const [activeTab, setActiveTab] = React.useState<'overview' | 'users' | 'ais'>('overview');
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
        {(['overview', 'users', 'ais'] as const).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'overview' ? 'Vue globale' : tab === 'users' ? 'Utilisateurs' : 'AIs'}
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

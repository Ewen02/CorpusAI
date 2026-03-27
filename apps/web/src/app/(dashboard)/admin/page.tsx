'use client';

import * as React from 'react';
import { Card, CardContent, Skeleton, Button } from '@corpusai/ui';
import { useAdminDashboard } from '@/lib/queries';
import { ShieldIcon } from '@/lib/icons';
import { PageWrapper } from '@/components/page-wrapper';
import { OverviewTab } from './components/overview-tab';
import { UsersTab } from './components/users-tab';
import { AIsTab } from './components/ais-tab';
import { EvalTab } from './components/eval-tab';
import { MonitoringTab } from './components/monitoring-tab';

type Tab = 'overview' | 'users' | 'ais' | 'eval' | 'monitoring';

const TAB_LABELS: Record<Tab, string> = {
  overview: 'Vue globale',
  users: 'Utilisateurs',
  ais: 'AIs',
  eval: 'Evaluation RAG',
  monitoring: 'Monitoring',
};

const TABS: Tab[] = ['overview', 'users', 'ais', 'eval', 'monitoring'];

export default function AdminPage() {
  const [activeTab, setActiveTab] = React.useState<Tab>('overview');
  const { data: dashboard, isLoading: dashLoading } = useAdminDashboard();

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
        {TABS.map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab)}
          >
            {TAB_LABELS[tab]}
          </Button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && dashboard && <OverviewTab dashboard={dashboard} />}
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'ais' && <AIsTab />}
      {activeTab === 'eval' && <EvalTab />}
      {activeTab === 'monitoring' && <MonitoringTab />}
    </PageWrapper>
  );
}

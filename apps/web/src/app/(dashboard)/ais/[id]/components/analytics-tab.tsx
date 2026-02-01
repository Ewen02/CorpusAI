'use client';

import * as React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@corpusai/ui';

interface AnalyticsTabProps {
  conversationCount: number;
  questionCount: number;
  documentCount: number;
}

/**
 * Analytics tab content for the AI detail page.
 * Displays usage statistics in a card grid.
 */
export const AnalyticsTab = React.memo(function AnalyticsTab({
  conversationCount,
  questionCount,
  documentCount,
}: AnalyticsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Analytiques</CardTitle>
        <CardDescription>
          Statistiques d&apos;utilisation de votre assistant
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard value={conversationCount} label="Conversations" />
          <StatCard value={questionCount} label="Questions" />
          <StatCard value={documentCount} label="Documents" />
        </div>
      </CardContent>
    </Card>
  );
});

/**
 * Simple stat card component.
 */
const StatCard = React.memo(function StatCard({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
});

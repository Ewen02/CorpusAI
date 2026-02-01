"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  StatCard,
  ChartTooltip,
} from "@corpusai/ui";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { useAnalytics, type AnalyticsPeriod } from "@/lib/queries";
import { AnalyticsSkeleton } from "@/components/skeletons";
import { PERIOD_OPTIONS, CHART_AXIS_STYLE } from "@/lib/constants";
import { formatDateShort, formatDateDay, formatDateLong } from "@/lib/utils";

const formatLabelLong = formatDateLong;
import { FileIcon, MessageIcon, CalendarIcon } from "@/lib/icons";
import { PageWrapper } from "@/components/page-wrapper";

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const { data, isLoading, error } = useAnalytics(period);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <AnalyticsSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Erreur lors du chargement des analytics
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PageWrapper className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Suivez l&apos;évolution de votre activité
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-card/30 backdrop-blur-sm p-1">
          {PERIOD_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={period === option.value ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setPeriod(option.value)}
              className="gap-2"
            >
              <CalendarIcon className="h-4 w-4" />
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Documents"
          value={data.totals.documents}
          trend={data.trends.documents}
          icon={FileIcon}
        />
        <StatCard
          title="Conversations"
          value={data.totals.conversations}
          trend={data.trends.conversations}
          icon={MessageIcon}
        />
        <StatCard
          title="Questions"
          value={data.totals.questions}
          trend={data.trends.questions}
          icon={MessageIcon}
        />
      </div>

      {/* Questions Chart */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Questions par jour</CardTitle>
          <CardDescription>
            Évolution du nombre de questions posées à vos AIs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.daily}>
                <defs>
                  <linearGradient
                    id="questionsGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateShort}
                  className="text-xs"
                  tick={CHART_AXIS_STYLE}
                />
                <YAxis className="text-xs" tick={CHART_AXIS_STYLE} />
                <Tooltip
                  content={({ active, payload, label }) => (
                    <ChartTooltip
                      active={active}
                      payload={payload}
                      label={label}
                      metric="questions"
                      formatLabel={formatLabelLong}
                    />
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="questions"
                  stroke="hsl(var(--primary))"
                  fill="url(#questionsGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Conversations & Documents Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
            <CardDescription>Nouvelles conversations par jour</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.daily}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateDay}
                    className="text-xs"
                    tick={CHART_AXIS_STYLE}
                  />
                  <YAxis className="text-xs" tick={CHART_AXIS_STYLE} />
                  <Tooltip
                    content={({ active, payload, label }) => (
                      <ChartTooltip
                        active={active}
                        payload={payload}
                        label={label}
                        metric="conversations"
                        formatLabel={formatLabelLong}
                      />
                    )}
                  />
                  <Bar
                    dataKey="conversations"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>Documents ajoutés par jour</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.daily}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateDay}
                    className="text-xs"
                    tick={CHART_AXIS_STYLE}
                  />
                  <YAxis className="text-xs" tick={CHART_AXIS_STYLE} />
                  <Tooltip
                    content={({ active, payload, label }) => (
                      <ChartTooltip
                        active={active}
                        payload={payload}
                        label={label}
                        metric="documents"
                        formatLabel={formatLabelLong}
                      />
                    )}
                  />
                  <Line
                    type="monotone"
                    dataKey="documents"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}

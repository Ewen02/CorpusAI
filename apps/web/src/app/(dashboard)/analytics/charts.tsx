'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartTooltip,
} from '@corpusai/ui';
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
} from 'recharts';
import { CHART_AXIS_STYLE } from '@/lib/constants';
import { formatDateShort, formatDateDay, formatDateLong } from '@/lib/utils';

const formatLabelLong = formatDateLong;

interface DailyData {
  date: string;
  questions: number;
  conversations: number;
  documents: number;
}

interface AnalyticsChartsProps {
  daily: DailyData[];
}

export default function AnalyticsCharts({ daily }: AnalyticsChartsProps) {
  return (
    <>
      {/* Questions Chart */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Questions par jour</CardTitle>
          <CardDescription>Évolution du nombre de questions posées à vos AIs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily}>
                <defs>
                  <linearGradient id="questionsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
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
                <BarChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
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
                  <Bar dataKey="conversations" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
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
                <LineChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
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
    </>
  );
}

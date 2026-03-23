'use client';

import { ChartTooltip } from '@corpusai/ui';
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
import { formatDateShort, formatDateDay, formatDateLong } from '@/lib/utils';

const AXIS_STYLE = { fill: 'hsl(var(--tx-muted))', fontSize: 11 };
const GRID_STROKE = 'hsl(var(--border-subtle))';

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
      <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-5">
        <div className="mb-5">
          <p className="text-[15px] font-semibold text-tx-primary">Questions par jour</p>
          <p className="mt-0.5 text-[13px] text-tx-muted">
            Évolution du nombre de questions posées à vos AIs
          </p>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily}>
              <defs>
                <linearGradient id="questionsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent-500))" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(var(--accent-500))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateShort}
                tick={AXIS_STYLE}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={28} />
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
                stroke="hsl(var(--accent-500))"
                fill="url(#questionsGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Conversations & Documents Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Conversations */}
        <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-5">
          <div className="mb-5">
            <p className="text-[15px] font-semibold text-tx-primary">Conversations</p>
            <p className="mt-0.5 text-[13px] text-tx-muted">Nouvelles conversations par jour</p>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateDay}
                  tick={AXIS_STYLE}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
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
                <Bar dataKey="conversations" fill="hsl(152 65% 45%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Documents */}
        <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-5">
          <div className="mb-5">
            <p className="text-[15px] font-semibold text-tx-primary">Documents</p>
            <p className="mt-0.5 text-[13px] text-tx-muted">Documents ajoutés par jour</p>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateDay}
                  tick={AXIS_STYLE}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
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
                  stroke="hsl(38 90% 55%)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: 'hsl(38 90% 55%)', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}

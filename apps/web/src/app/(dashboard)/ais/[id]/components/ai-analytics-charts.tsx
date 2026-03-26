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
import { AXIS_STYLE, GRID_STROKE } from '@/lib/constants/charts';

const formatLabelLong = formatDateLong;

interface DailyData {
  date: string;
  questions: number;
  conversations: number;
  documents: number;
}

interface AIAnalyticsChartsProps {
  daily: DailyData[];
}

function ChartEmptyState({ message, hint }: { message: string; hint: string }) {
  return (
    <div className="flex h-full items-center justify-center text-center">
      <div>
        <p className="text-sm text-tx-secondary">{message}</p>
        <p className="mt-1 text-xs text-tx-muted">{hint}</p>
      </div>
    </div>
  );
}

export default function AIAnalyticsCharts({ daily }: AIAnalyticsChartsProps) {
  const hasQuestions = daily.some((d) => d.questions > 0);
  const hasConversations = daily.some((d) => d.conversations > 0);
  const hasDocuments = daily.some((d) => d.documents > 0);

  return (
    <>
      {/* Questions Chart */}
      <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-5">
        <div className="mb-5">
          <p className="text-[15px] font-semibold text-tx-primary">Questions par jour</p>
          <p className="mt-0.5 text-[13px] text-tx-muted">Questions posées à cet assistant</p>
        </div>
        <div className="h-[300px]">
          {hasQuestions ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily}>
                <defs>
                  <linearGradient id="aiQuestionsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent-500))" stopOpacity={0.4} />
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
                <YAxis
                  tick={AXIS_STYLE}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                  allowDecimals={false}
                />
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
                  fill="url(#aiQuestionsGradient)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: 'hsl(var(--accent-500))', strokeWidth: 0 }}
                  activeDot={{
                    r: 6,
                    fill: 'hsl(var(--accent-500))',
                    strokeWidth: 2,
                    stroke: 'hsl(var(--surface-1))',
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmptyState
              message="Aucune question pour l'instant"
              hint="Posez une question à votre assistant pour voir les statistiques"
            />
          )}
        </div>
      </div>

      {/* Conversations & Documents Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Conversations */}
        <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-5">
          <div className="mb-5">
            <p className="text-[15px] font-semibold text-tx-primary">Conversations</p>
            <p className="mt-0.5 text-[13px] text-tx-muted">Nouvelles conversations</p>
          </div>
          <div className="h-[200px]">
            {hasConversations ? (
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
                  <YAxis
                    tick={AXIS_STYLE}
                    axisLine={false}
                    tickLine={false}
                    width={20}
                    allowDecimals={false}
                  />
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
                    fill="hsl(152 65% 45%)"
                    radius={[4, 4, 0, 0]}
                    minPointSize={4}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmptyState
                message="Aucune conversation"
                hint="Les conversations apparaîtront ici"
              />
            )}
          </div>
        </div>

        {/* Documents */}
        <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-5">
          <div className="mb-5">
            <p className="text-[15px] font-semibold text-tx-primary">Documents</p>
            <p className="mt-0.5 text-[13px] text-tx-muted">Documents ajoutés</p>
          </div>
          <div className="h-[200px]">
            {hasDocuments ? (
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
                  <YAxis
                    tick={AXIS_STYLE}
                    axisLine={false}
                    tickLine={false}
                    width={20}
                    allowDecimals={false}
                  />
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
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: 'hsl(38 90% 55%)', strokeWidth: 0 }}
                    activeDot={{
                      r: 5,
                      fill: 'hsl(38 90% 55%)',
                      strokeWidth: 2,
                      stroke: 'hsl(var(--surface-1))',
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmptyState
                message="Aucun document"
                hint="Ajoutez des documents pour voir l'évolution"
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

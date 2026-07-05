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

export interface DailyData {
  date: string;
  questions: number;
  conversations: number;
  documents: number;
}

export interface DailyActivityChartsLabels {
  questionsTitle: string;
  questionsSubtitle: string;
  conversationsTitle: string;
  conversationsSubtitle: string;
  documentsTitle: string;
  documentsSubtitle: string;
  /** Empty-state copy — only rendered when `showEmptyStates` is enabled. */
  emptyQuestions: string;
  emptyQuestionsHint: string;
  emptyConversations: string;
  emptyConversationsHint: string;
  emptyDocuments: string;
  emptyDocumentsHint: string;
}

interface DailyActivityChartsProps {
  daily: DailyData[];
  labels: DailyActivityChartsLabels;
  /**
   * When `true`, each chart shows an empty state until it has non-zero data,
   * data-point dots are drawn, and the small charts keep a visible Y axis
   * (AI-detail behavior). When `false`, charts always render without dots and
   * with hidden Y axes on the small charts (global-analytics behavior).
   */
  showEmptyStates?: boolean;
  /** Fill opacity at the top of the questions area gradient. */
  gradientOpacity?: number;
  /** Unique id suffix so the two variants don't share an SVG gradient id. */
  gradientId?: string;
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

const formatLabelLong = formatDateLong;

export default function DailyActivityCharts({
  daily,
  labels,
  showEmptyStates = false,
  gradientOpacity = 0.25,
  gradientId = 'questionsGradient',
}: DailyActivityChartsProps) {
  const showDots = showEmptyStates;
  const hasQuestions = !showEmptyStates || daily.some((d) => d.questions > 0);
  const hasConversations = !showEmptyStates || daily.some((d) => d.conversations > 0);
  const hasDocuments = !showEmptyStates || daily.some((d) => d.documents > 0);

  return (
    <>
      {/* Questions Chart */}
      <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-5">
        <div className="mb-5">
          <p className="text-[15px] font-semibold text-tx-primary">{labels.questionsTitle}</p>
          <p className="mt-0.5 text-[13px] text-tx-muted">{labels.questionsSubtitle}</p>
        </div>
        <div className="h-[300px]">
          {hasQuestions ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--accent-500))"
                      stopOpacity={gradientOpacity}
                    />
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
                  allowDecimals={!showEmptyStates}
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
                  fill={`url(#${gradientId})`}
                  strokeWidth={showDots ? 2.5 : 2}
                  dot={showDots ? { r: 4, fill: 'hsl(var(--accent-500))', strokeWidth: 0 } : false}
                  activeDot={
                    showDots
                      ? {
                          r: 6,
                          fill: 'hsl(var(--accent-500))',
                          strokeWidth: 2,
                          stroke: 'hsl(var(--surface-1))',
                        }
                      : undefined
                  }
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmptyState message={labels.emptyQuestions} hint={labels.emptyQuestionsHint} />
          )}
        </div>
      </div>

      {/* Conversations & Documents Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Conversations */}
        <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-5">
          <div className="mb-5">
            <p className="text-[15px] font-semibold text-tx-primary">{labels.conversationsTitle}</p>
            <p className="mt-0.5 text-[13px] text-tx-muted">{labels.conversationsSubtitle}</p>
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
                  {showEmptyStates ? (
                    <YAxis
                      tick={AXIS_STYLE}
                      axisLine={false}
                      tickLine={false}
                      width={20}
                      allowDecimals={false}
                    />
                  ) : (
                    <YAxis hide />
                  )}
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
                    radius={showDots ? [4, 4, 0, 0] : [3, 3, 0, 0]}
                    minPointSize={showDots ? 4 : undefined}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmptyState
                message={labels.emptyConversations}
                hint={labels.emptyConversationsHint}
              />
            )}
          </div>
        </div>

        {/* Documents */}
        <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-5">
          <div className="mb-5">
            <p className="text-[15px] font-semibold text-tx-primary">{labels.documentsTitle}</p>
            <p className="mt-0.5 text-[13px] text-tx-muted">{labels.documentsSubtitle}</p>
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
                  {showEmptyStates ? (
                    <YAxis
                      tick={AXIS_STYLE}
                      axisLine={false}
                      tickLine={false}
                      width={20}
                      allowDecimals={false}
                    />
                  ) : (
                    <YAxis hide />
                  )}
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
                    strokeWidth={showDots ? 2.5 : 2}
                    dot={showDots ? { r: 3.5, fill: 'hsl(38 90% 55%)', strokeWidth: 0 } : false}
                    activeDot={
                      showDots
                        ? {
                            r: 5,
                            fill: 'hsl(38 90% 55%)',
                            strokeWidth: 2,
                            stroke: 'hsl(var(--surface-1))',
                          }
                        : { r: 4, fill: 'hsl(38 90% 55%)', strokeWidth: 0 }
                    }
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmptyState message={labels.emptyDocuments} hint={labels.emptyDocumentsHint} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

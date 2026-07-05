'use client';

import { useTranslations } from 'next-intl';
import DailyActivityCharts, {
  type DailyData,
  type DailyActivityChartsLabels,
} from '@/components/daily-activity-charts';

interface AnalyticsChartsProps {
  daily: DailyData[];
}

export default function AnalyticsCharts({ daily }: AnalyticsChartsProps) {
  const t = useTranslations('analytics.charts');

  const labels: DailyActivityChartsLabels = {
    questionsTitle: t('questionsTitle'),
    questionsSubtitle: t('questionsSubtitleGlobal'),
    conversationsTitle: t('conversationsTitle'),
    conversationsSubtitle: t('conversationsSubtitleGlobal'),
    documentsTitle: t('documentsTitle'),
    documentsSubtitle: t('documentsSubtitleGlobal'),
    emptyQuestions: t('emptyQuestions'),
    emptyQuestionsHint: t('emptyQuestionsHint'),
    emptyConversations: t('emptyConversations'),
    emptyConversationsHint: t('emptyConversationsHint'),
    emptyDocuments: t('emptyDocuments'),
    emptyDocumentsHint: t('emptyDocumentsHint'),
  };

  return (
    <DailyActivityCharts
      daily={daily}
      labels={labels}
      showEmptyStates={false}
      gradientOpacity={0.25}
      gradientId="questionsGradient"
    />
  );
}

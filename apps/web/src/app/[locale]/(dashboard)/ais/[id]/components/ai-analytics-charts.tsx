'use client';

import { useTranslations } from 'next-intl';
import DailyActivityCharts, {
  type DailyData,
  type DailyActivityChartsLabels,
} from '@/components/daily-activity-charts';

interface AIAnalyticsChartsProps {
  daily: DailyData[];
}

export default function AIAnalyticsCharts({ daily }: AIAnalyticsChartsProps) {
  const t = useTranslations('analytics.charts');

  const labels: DailyActivityChartsLabels = {
    questionsTitle: t('questionsTitle'),
    questionsSubtitle: t('questionsSubtitleAi'),
    conversationsTitle: t('conversationsTitle'),
    conversationsSubtitle: t('conversationsSubtitleAi'),
    documentsTitle: t('documentsTitle'),
    documentsSubtitle: t('documentsSubtitleAi'),
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
      showEmptyStates
      gradientOpacity={0.4}
      gradientId="aiQuestionsGradient"
    />
  );
}

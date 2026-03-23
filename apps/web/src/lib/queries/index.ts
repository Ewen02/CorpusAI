// Types
export * from './types';

// AI hooks
export {
  aiKeys,
  useAIs,
  useAI,
  useAIBySlug,
  useCreateAI,
  useUpdateAI,
  useDeleteAI,
} from './use-ai';

// Conversation hooks
export {
  conversationKeys,
  useConversations,
  useConversation,
  useStartConversation,
  useDeleteConversation,
} from './use-conversations';

// Message hooks
export { messageKeys, useMessages, useSendMessage, useSendMessageStream } from './use-messages';

// Document hooks
export {
  documentKeys,
  useDocuments,
  useDocument,
  useCreateDocument,
  useCreateTextDocument,
  useDeleteDocument,
  useRetryDocument,
} from './use-documents';

// Dashboard hooks
export {
  dashboardKeys,
  useDashboardStats,
  usageKeys,
  useUsage,
  type DashboardStats,
  type UsageData,
  type UsageLimitItem,
} from './use-dashboard';

// Analytics hooks
export {
  analyticsKeys,
  useAnalytics,
  type AnalyticsData,
  type AnalyticsPeriod,
  type DailyDataPoint,
  type Trend,
} from './use-analytics';

// Admin hooks
export {
  adminKeys,
  useAdminDashboard,
  useAdminUsers,
  useAdminAIs,
  useUpdateUserRole,
  useUpdateUserPlan,
  type AdminDashboard,
  type AdminUser,
  type AdminAI,
} from './use-admin';

// API Key hooks
export {
  apiKeyKeys,
  useApiKeys,
  useCreateApiKey,
  useDeleteApiKey,
  type ApiKeyInfo,
  type NewApiKey,
} from './use-api-keys';

// Billing hooks
export {
  billingKeys,
  useInvoices,
  useCreateCheckout,
  useCustomerPortal,
  type Invoice,
} from './use-billing';

// Eval hooks
export {
  evalKeys,
  useEvalReports,
  useEvalReport,
  useEvalDatasets,
  useRunEval,
  type EvalReport,
  type EvalReportSummary,
  type EvalSummary,
  type EvalResult,
  type EvalMetrics,
} from './use-eval';

// Explore hooks
export {
  exploreKeys,
  useExploreAIs,
  useFeaturedAIs,
  useCreatorProfile,
  type ExploreAICard,
  type ExploreCreator,
  type ExploreMeta,
  type ExploreAIsResponse,
  type CreatorProfile,
  type ExploreParams,
} from './use-explore';

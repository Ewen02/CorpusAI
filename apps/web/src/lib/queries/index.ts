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
  useGenerateSuggestions,
  type AISuggestions,
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
  useAIAnalytics,
  useDocumentChunkUsage,
  type AnalyticsData,
  type AIAnalyticsData,
  type AnalyticsPeriod,
  type DailyDataPoint,
  type Trend,
  type ChunkUsageItem,
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

// Portal hooks
export {
  portalKeys,
  usePortalMe,
  usePortalConversations,
  usePortalConversation,
  useSendMagicLink,
  usePortalSignOut,
  type PortalEndUser,
  type PortalAI,
  type PortalConversation,
  type PortalMessage,
  type PortalConversationDetail,
} from './use-portal';

// Webhook hooks
export {
  webhookKeys,
  useWebhooks,
  useCreateWebhook,
  useDeleteWebhook,
  useTestWebhook,
  type WebhookInfo,
  type WebhookDelivery,
  type NewWebhook,
} from './use-webhooks';

// AI access hooks
export {
  aiAccessKeys,
  useAIMembers,
  useGenerateAccessToken,
  useDeleteAccessToken,
  useSetAccessCode,
  useDeleteAccessCode,
  useUpdateInviteOnly,
  useSetAccessMode,
  useInviteMember,
  useRevokeMember,
  type AIAccessGrant,
} from './use-ai-access';

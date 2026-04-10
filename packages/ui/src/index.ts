// Utilities
export { cn } from './lib/utils';

// Atoms
export { IconBox } from './atoms/icon-box';
export type { IconBoxProps } from './atoms/icon-box';

export { Button, buttonVariants } from './atoms/button';
export type { ButtonProps } from './atoms/button';

export { Input } from './atoms/input';
export type { InputProps } from './atoms/input';

export { Label } from './atoms/label';

export { Badge, badgeVariants } from './atoms/badge';
export type { BadgeProps } from './atoms/badge';

export { Logo } from './atoms/logo';
export type { LogoProps } from './atoms/logo';

export { Skeleton } from './atoms/skeleton';

export { Avatar, AvatarImage, AvatarFallback } from './atoms/avatar';

export { Separator } from './atoms/separator';

export { Tabs, TabsList, TabsTrigger, TabsContent } from './atoms/tabs';

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from './atoms/select';

export { Switch } from './atoms/switch';

export { Textarea } from './atoms/textarea';
export type { TextareaProps } from './atoms/textarea';

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './atoms/table';

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './atoms/dialog';

export { CopyButton } from './atoms/copy-button';
export type { CopyButtonProps } from './atoms/copy-button';

export {
  DocumentIcon,
  ChatIcon,
  QuestionIcon,
  SettingsIcon,
  ShareIcon,
  TrashIcon,
  RefreshIcon,
  PlusIcon,
  SearchIcon,
  ChevronRightIcon,
  CheckIcon,
  XIcon,
  LoaderIcon,
} from './atoms/icons';

// Molecules
export {
  Card,
  cardVariants,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './molecules/card';
export type { CardProps } from './molecules/card';

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './molecules/tooltip';

export { TrendBadge } from './molecules/trend-badge';
export type { TrendBadgeProps } from './molecules/trend-badge';

export { StatCard } from './molecules/stat-card';
export type { StatCardProps } from './molecules/stat-card';

export { ChartTooltip } from './molecules/chart-tooltip';
export type { ChartTooltipProps } from './molecules/chart-tooltip';

export { MarkdownRenderer } from './molecules/markdown-renderer';

export { ExploreAICard } from './molecules/explore-ai-card';
export type { ExploreAICardProps } from './molecules/explore-ai-card';

export { SectionHeader } from './molecules/section-header';
export type { SectionHeaderProps } from './molecules/section-header';

export { AnalyticsCard } from './molecules/analytics-card';
export type { AnalyticsCardProps } from './molecules/analytics-card';

export { CodeBlock } from './molecules/code-block';

// Organisms
export { ChatInterface, ChatInterfaceSkeleton } from './organisms/chat-interface';
export type {
  ChatInterfaceProps,
  ChatMessage,
  ChatSource,
  ConfidenceLevel,
} from './organisms/chat-interface';

export { DocumentUploader, DocumentUploaderSkeleton } from './organisms/document-uploader';
export type {
  DocumentUploaderProps,
  UploadedFile,
  DocumentUploadStatus,
} from './organisms/document-uploader';

export { ConversationList, ConversationListSkeleton } from './organisms/conversation-list';
export type { ConversationListProps, Conversation } from './organisms/conversation-list';

export {
  SourceCitation,
  SourceCitationSkeleton,
  InlineCitation,
} from './organisms/source-citation';
export type {
  SourceCitationProps,
  SourceCitationCardProps,
  InlineCitationProps,
  Source,
} from './organisms/source-citation';

export { ShareModal } from './organisms/share-modal';
export type { ShareModalProps, ShareModalAI } from './organisms/share-modal';

export { NotificationBar } from './organisms/notification-bar';
export type { NotificationBarProps, NotificationBarItem } from './organisms/notification-bar';

// Templates
export { DashboardLayout, DashboardLayoutSkeleton } from './templates/dashboard-layout';
export type {
  DashboardLayoutProps,
  DashboardLayoutLabels,
  NavItem,
  AINavItem,
  UserData,
} from './templates/dashboard-layout';

export { AuthLayout, AuthForm, AuthDivider, AuthLink, SocialButton } from './templates/auth-layout';
export type {
  AuthLayoutProps,
  AuthFormProps,
  AuthDividerProps,
  AuthLinkProps,
  SocialButtonProps,
} from './templates/auth-layout';

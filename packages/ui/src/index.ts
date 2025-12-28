// Utilities
export { cn } from "./lib/utils";

// Atoms
export { Button, buttonVariants } from "./atoms/button";
export type { ButtonProps } from "./atoms/button";

export { Input } from "./atoms/input";
export type { InputProps } from "./atoms/input";

export { Label } from "./atoms/label";

export { Badge, badgeVariants } from "./atoms/badge";
export type { BadgeProps } from "./atoms/badge";

export { Skeleton } from "./atoms/skeleton";

export { Avatar, AvatarImage, AvatarFallback } from "./atoms/avatar";

export { Separator } from "./atoms/separator";

export { Tabs, TabsList, TabsTrigger, TabsContent } from "./atoms/tabs";

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from "./atoms/select";

export { Switch } from "./atoms/switch";

export { Textarea } from "./atoms/textarea";
export type { TextareaProps } from "./atoms/textarea";

// Molecules
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "./molecules/card";

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "./molecules/tooltip";

// Organisms
export {
  ChatInterface,
  ChatInterfaceSkeleton,
} from "./organisms/chat-interface";
export type {
  ChatInterfaceProps,
  ChatMessage,
  ChatSource,
} from "./organisms/chat-interface";

export {
  DocumentUploader,
  DocumentUploaderSkeleton,
} from "./organisms/document-uploader";
export type {
  DocumentUploaderProps,
  UploadedFile,
  DocumentUploadStatus,
} from "./organisms/document-uploader";

export {
  ConversationList,
  ConversationListSkeleton,
} from "./organisms/conversation-list";
export type {
  ConversationListProps,
  Conversation,
} from "./organisms/conversation-list";

export {
  SourceCitation,
  SourceCitationSkeleton,
  InlineCitation,
} from "./organisms/source-citation";
export type {
  SourceCitationProps,
  SourceCitationCardProps,
  InlineCitationProps,
  Source,
} from "./organisms/source-citation";

// Templates
export {
  DashboardLayout,
  DashboardLayoutSkeleton,
} from "./templates/dashboard-layout";
export type {
  DashboardLayoutProps,
  NavItem,
  AINavItem,
  UserData,
} from "./templates/dashboard-layout";

export {
  AuthLayout,
  AuthForm,
  AuthDivider,
  AuthLink,
  SocialButton,
} from "./templates/auth-layout";
export type {
  AuthLayoutProps,
  AuthFormProps,
  AuthDividerProps,
  AuthLinkProps,
  SocialButtonProps,
} from "./templates/auth-layout";

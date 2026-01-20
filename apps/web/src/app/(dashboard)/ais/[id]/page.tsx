"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Button,
  Badge,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  ChatInterface,
  ChatInterfaceSkeleton,
  DocumentUploader,
  DocumentUploaderSkeleton,
  ConversationList,
  ConversationListSkeleton,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  DocumentIcon,
  ChatIcon,
  QuestionIcon,
  SettingsIcon,
  ShareIcon,
  TrashIcon,
  RefreshIcon,
  type ChatMessage,
  type ChatSource,
  type UploadedFile,
  type Conversation,
} from "@corpusai/ui";
import {
  useAI,
  useConversations,
  useStartConversation,
  useSendMessageStream,
  useMessages,
  useDocuments,
  useDeleteDocument,
  useRetryDocument,
  documentKeys,
  type MessageSource,
  type Document,
} from "@/lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

// Types for AI data (extended from API)
interface AIData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
  welcomeMessage?: string;
  primaryColor?: string;
  documentCount: number;
  conversationCount: number;
  questionCount: number;
  createdAt: string;
}

export default function AIDetailPage() {
  const params = useParams();
  const router = useRouter();
  const aiId = params.id as string;

  // React Query hooks
  const queryClient = useQueryClient();
  const { data: ai, isLoading: isLoadingAI } = useAI(aiId);
  const { data: conversationsData, isLoading: isLoadingConversations } = useConversations(aiId);
  const { data: documents, isLoading: isLoadingDocuments } = useDocuments(aiId);
  const startConversation = useStartConversation();
  const deleteDocument = useDeleteDocument();
  const retryDocument = useRetryDocument();
  const { sendStream, isStreaming, streamingContent } = useSendMessageStream();

  // Local state for chat
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [currentConversationId, setCurrentConversationId] = React.useState<string | null>(null);
  const [streamingMessageId, setStreamingMessageId] = React.useState<string | null>(null);

  // Documents state
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([]);

  // Transform conversations data
  const conversations: Conversation[] = React.useMemo(() => {
    if (!conversationsData) return [];
    return conversationsData.map((conv) => ({
      id: conv.id,
      title: conv.title || "Nouvelle conversation",
      lastMessage: conv.lastMessage || "",
      messageCount: conv.messageCount,
      createdAt: new Date(conv.createdAt),
      updatedAt: new Date(conv.updatedAt),
    }));
  }, [conversationsData]);

  // Load messages when conversation changes
  const { data: messagesData } = useMessages(currentConversationId);

  React.useEffect(() => {
    if (messagesData) {
      const formattedMessages: ChatMessage[] = messagesData.map((msg) => ({
        id: msg.id,
        role: msg.role.toLowerCase() as "user" | "assistant",
        content: msg.content,
        createdAt: new Date(msg.createdAt),
        sources: msg.sources?.map((s: MessageSource) => ({
          documentId: s.chunkId,
          documentName: s.documentSource,
          excerpt: s.excerpt,
          relevanceScore: s.score,
        })),
      }));
      setMessages(formattedMessages);
    }
  }, [messagesData]);

  // Update streaming message content in real-time
  React.useEffect(() => {
    if (isStreaming && streamingMessageId && streamingContent) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingMessageId ? { ...m, content: streamingContent } : m
        )
      );
    }
  }, [isStreaming, streamingMessageId, streamingContent]);

  // Handle sending a message with streaming
  const handleSendMessage = async (content: string) => {
    if (!ai || isStreaming) return;

    // Add user message optimistically
    const userMessage: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date(),
    };

    // Add streaming assistant message placeholder
    const assistantMessageId = `temp-assistant-${Date.now()}`;
    const streamingAssistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      createdAt: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, streamingAssistantMessage]);
    setStreamingMessageId(assistantMessageId);

    try {
      // Create conversation if needed
      let convId = currentConversationId;
      if (!convId) {
        const convData = await startConversation.mutateAsync(ai.slug);
        convId = convData.id;
        setCurrentConversationId(convId);
      }

      // Send message with streaming
      sendStream(convId, content, {
        onToken: (_token, fullContent) => {
          // Update streaming message content
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId ? { ...m, content: fullContent } : m
            )
          );
        },
        onSources: (sources) => {
          // Update with sources
          const formattedSources: ChatSource[] = sources.map((s) => ({
            documentId: s.chunkId,
            documentName: s.documentSource,
            excerpt: s.excerpt,
            relevanceScore: s.score,
          }));
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId ? { ...m, sources: formattedSources } : m
            )
          );
        },
        onDone: (data) => {
          // Finalize messages with real IDs
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id === userMessage.id) {
                return {
                  ...m,
                  id: data.userMessage.id,
                  createdAt: new Date(data.userMessage.createdAt),
                };
              }
              if (m.id === assistantMessageId) {
                const formattedSources: ChatSource[] = data.assistantMessage.sources.map((s) => ({
                  documentId: s.chunkId,
                  documentName: s.documentSource,
                  excerpt: s.excerpt,
                  relevanceScore: s.score,
                }));
                return {
                  ...m,
                  id: data.assistantMessage.id,
                  content: data.assistantMessage.content,
                  sources: formattedSources,
                  createdAt: new Date(data.assistantMessage.createdAt),
                  isStreaming: false,
                };
              }
              return m;
            })
          );
          setStreamingMessageId(null);
        },
        onError: (error) => {
          console.error("Streaming error:", error);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    content: "Une erreur s'est produite. Veuillez reessayer.",
                    isStreaming: false,
                  }
                : m
            )
          );
          setStreamingMessageId(null);
        },
      });
    } catch (error) {
      console.error("Error starting stream:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? {
                ...m,
                content: "Une erreur s'est produite. Veuillez reessayer.",
                isStreaming: false,
              }
            : m
        )
      );
      setStreamingMessageId(null);
    }
  };

  // Handle file upload
  const handleFilesSelected = async (files: File[]) => {
    const newFiles: UploadedFile[] = files.map((file) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      file,
      status: "pending" as const,
      progress: 0,
    }));

    setUploadedFiles((prev) => [...prev, ...newFiles]);

    // Upload each file
    for (const uploadedFile of newFiles) {
      try {
        // Update status to uploading
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id ? { ...f, status: "uploading" as const, progress: 30 } : f
          )
        );

        // Send as JSON with file content
        const reader = new FileReader();
        const content = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(uploadedFile.file);
        });

        await apiClient.post(`/ais/${aiId}/documents/text`, {
          filename: uploadedFile.file.name,
          content,
        });

        // Update status to processing then success
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id ? { ...f, status: "processing" as const, progress: 70 } : f
          )
        );

        await new Promise((resolve) => setTimeout(resolve, 500));

        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id ? { ...f, status: "success" as const, progress: 100 } : f
          )
        );

        // Invalidate documents list to refresh the right panel
        queryClient.invalidateQueries({
          queryKey: documentKeys.listByAI(aiId),
        });
      } catch (error) {
        console.error("Upload error:", error);
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id
              ? { ...f, status: "error" as const, error: "Echec de l'upload" }
              : f
          )
        );
      }
    }
  };

  // Handle file removal
  const handleFileRemove = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // Handle conversation selection
  const handleConversationSelect = async (conversation: Conversation) => {
    setCurrentConversationId(conversation.id);
    // Messages will be loaded automatically via useMessages hook
  };

  // Handle new conversation
  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
  };

  // Handle source click
  const handleSourceClick = (source: ChatSource) => {
    console.log("Source clicked:", source);
  };

  // Handle document actions
  const handleDeleteDocument = (documentId: string) => {
    deleteDocument.mutate({ aiId, id: documentId });
  };

  const handleRetryDocument = (documentId: string) => {
    retryDocument.mutate({ aiId, id: documentId });
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Cast AI data with additional fields
  const aiData = ai as AIData | undefined;

  if (isLoadingAI) {
    return (
      <div className="container py-8">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-96" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    );
  }

  if (!aiData) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Assistant introuvable</p>
            <Button className="mt-4" onClick={() => router.push("/ais")}>
              Retour a la liste
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusColors: Record<AIData["status"], string> = {
    DRAFT: "bg-yellow-500/20 text-yellow-400",
    ACTIVE: "bg-green-500/20 text-green-400",
    PAUSED: "bg-orange-500/20 text-orange-400",
    ARCHIVED: "bg-muted text-muted-foreground",
  };

  const statusLabels: Record<AIData["status"], string> = {
    DRAFT: "Brouillon",
    ACTIVE: "Actif",
    PAUSED: "En pause",
    ARCHIVED: "Archive",
  };

  return (
    <TooltipProvider>
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{aiData.name}</h1>
              <Badge className={statusColors[aiData.status]}>
                {statusLabels[aiData.status]}
              </Badge>
            </div>
            {aiData.description && (
              <p className="text-muted-foreground mt-2">{aiData.description}</p>
            )}
            <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1">
                    <DocumentIcon className="h-4 w-4" />
                    {aiData.documentCount} documents
                  </span>
                </TooltipTrigger>
                <TooltipContent>Documents indexes</TooltipContent>
              </Tooltip>
              <Separator orientation="vertical" className="h-4" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1">
                    <ChatIcon className="h-4 w-4" />
                    {aiData.conversationCount} conversations
                  </span>
                </TooltipTrigger>
                <TooltipContent>Conversations totales</TooltipContent>
              </Tooltip>
              <Separator orientation="vertical" className="h-4" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1">
                    <QuestionIcon className="h-4 w-4" />
                    {aiData.questionCount} questions
                  </span>
                </TooltipTrigger>
                <TooltipContent>Questions posees</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push(`/ais/${aiId}/settings`)}>
              <SettingsIcon className="h-4 w-4 mr-2" />
              Parametres
            </Button>
            <Button variant="outline">
              <ShareIcon className="h-4 w-4 mr-2" />
              Partager
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="chat" className="space-y-6">
          <TabsList>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="conversations">Historique</TabsTrigger>
            <TabsTrigger value="analytics">Analytiques</TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-0">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Conversation sidebar */}
              <div className="lg:col-span-1">
                {isLoadingConversations ? (
                  <ConversationListSkeleton />
                ) : (
                  <ConversationList
                    conversations={conversations}
                    selectedId={currentConversationId || undefined}
                    onSelect={handleConversationSelect}
                    onNewConversation={handleNewConversation}
                  />
                )}
              </div>

              {/* Chat interface */}
              <Card className="lg:col-span-3 h-[600px] flex flex-col">
                <ChatInterface
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isLoading={isStreaming}
                  welcomeMessage={aiData.welcomeMessage}
                  aiName={aiData.name}
                  primaryColor={aiData.primaryColor}
                  onSourceClick={handleSourceClick}
                  className="flex-1"
                />
              </Card>
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DocumentUploader
                onFilesSelected={handleFilesSelected}
                onFileRemove={handleFileRemove}
                uploadedFiles={uploadedFiles}
              />

              <Card>
                <CardHeader>
                  <CardTitle>Documents indexes</CardTitle>
                  <CardDescription>
                    {aiData.documentCount} document(s) dans la base de connaissances
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingDocuments ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : !documents || documents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <DocumentIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Aucun document indexe</p>
                      <p className="text-sm">
                        Ajoutez des documents pour enrichir votre assistant.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <DocumentIcon className="h-8 w-8 text-muted-foreground shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{doc.filename}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{formatFileSize(doc.size)}</span>
                                {doc.chunkCount !== undefined && (
                                  <>
                                    <span>•</span>
                                    <span>{doc.chunkCount} chunks</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              className={
                                doc.status === "INDEXED"
                                  ? "bg-green-500/20 text-green-400"
                                  : doc.status === "PROCESSING"
                                    ? "bg-blue-500/20 text-blue-400"
                                    : doc.status === "PENDING"
                                      ? "bg-yellow-500/20 text-yellow-400"
                                      : "bg-red-500/20 text-red-400"
                              }
                            >
                              {doc.status === "INDEXED"
                                ? "Indexe"
                                : doc.status === "PROCESSING"
                                  ? "En cours"
                                  : doc.status === "PENDING"
                                    ? "En attente"
                                    : "Erreur"}
                            </Badge>
                            {doc.status === "FAILED" && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleRetryDocument(doc.id)}
                                  >
                                    <RefreshIcon className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Reessayer l&apos;indexation</TooltipContent>
                              </Tooltip>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleDeleteDocument(doc.id)}
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Supprimer le document</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Conversations Tab */}
          <TabsContent value="conversations">
            {isLoadingConversations ? (
              <ConversationListSkeleton />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Historique des conversations</CardTitle>
                  <CardDescription>
                    {conversations.length} conversation(s)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {conversations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ChatIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Aucune conversation</p>
                      <p className="text-sm">
                        Les conversations apparaitront ici.
                      </p>
                    </div>
                  ) : (
                    <ConversationList
                      conversations={conversations}
                      selectedId={currentConversationId || undefined}
                      onSelect={handleConversationSelect}
                      onNewConversation={handleNewConversation}
                    />
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Analytiques</CardTitle>
                <CardDescription>
                  Statistiques d&apos;utilisation de votre assistant
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{aiData.conversationCount}</div>
                      <p className="text-sm text-muted-foreground">Conversations</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{aiData.questionCount}</div>
                      <p className="text-sm text-muted-foreground">Questions</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{aiData.documentCount}</div>
                      <p className="text-sm text-muted-foreground">Documents</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

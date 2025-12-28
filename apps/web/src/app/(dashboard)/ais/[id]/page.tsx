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
  type ChatMessage,
  type ChatSource,
  type UploadedFile,
  type Conversation,
} from "@corpusai/ui";

// Types for AI data
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

  // AI Data
  const [ai, setAI] = React.useState<AIData | null>(null);
  const [isLoadingAI, setIsLoadingAI] = React.useState(true);

  // Chat state
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = React.useState(false);
  const [currentConversationId, setCurrentConversationId] = React.useState<string | null>(null);

  // Conversations state
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = React.useState(true);

  // Documents state
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([]);

  // Fetch AI data
  React.useEffect(() => {
    const fetchAI = async () => {
      try {
        const response = await fetch(`http://localhost:3001/ais/${aiId}`, {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setAI(data);
        }
      } catch (error) {
        console.error("Error fetching AI:", error);
      } finally {
        setIsLoadingAI(false);
      }
    };

    fetchAI();
  }, [aiId]);

  // Fetch conversations
  React.useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await fetch(`http://localhost:3001/ais/${aiId}/conversations`, {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setConversations(
            data.map((conv: { id: string; title?: string; lastMessage?: string; messageCount: number; createdAt: string; updatedAt: string }) => ({
              id: conv.id,
              title: conv.title || "Nouvelle conversation",
              lastMessage: conv.lastMessage || "",
              messageCount: conv.messageCount,
              createdAt: new Date(conv.createdAt),
              updatedAt: new Date(conv.updatedAt),
            }))
          );
        }
      } catch (error) {
        console.error("Error fetching conversations:", error);
      } finally {
        setIsLoadingConversations(false);
      }
    };

    fetchConversations();
  }, [aiId]);

  // Handle sending a message
  const handleSendMessage = async (content: string) => {
    // Add user message optimistically
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsChatLoading(true);

    try {
      // TODO: Implement actual API call to chat endpoint
      // For now, simulate a response
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const assistantMessage: ChatMessage = {
        id: `temp-${Date.now() + 1}`,
        role: "assistant",
        content: "Je suis desole, le systeme de chat n'est pas encore connecte au backend RAG. Cette fonctionnalite sera disponible prochainement.",
        createdAt: new Date(),
        sources: [],
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Handle file upload
  const handleFilesSelected = async (files: File[]) => {
    const newFiles: UploadedFile[] = files.map((file) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

        const formData = new FormData();
        formData.append("file", uploadedFile.file);

        const response = await fetch(`http://localhost:3001/ais/${aiId}/documents`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (response.ok) {
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
        } else {
          throw new Error("Upload failed");
        }
      } catch (error) {
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
    // TODO: Load messages for selected conversation
    setMessages([]);
  };

  // Handle new conversation
  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
  };

  // Handle source click
  const handleSourceClick = (source: ChatSource) => {
    // TODO: Open document viewer at specific location
    console.log("Source clicked:", source);
  };

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

  if (!ai) {
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
              <h1 className="text-3xl font-bold tracking-tight">{ai.name}</h1>
              <Badge className={statusColors[ai.status]}>
                {statusLabels[ai.status]}
              </Badge>
            </div>
            {ai.description && (
              <p className="text-muted-foreground mt-2">{ai.description}</p>
            )}
            <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1">
                    <DocumentIcon className="h-4 w-4" />
                    {ai.documentCount} documents
                  </span>
                </TooltipTrigger>
                <TooltipContent>Documents indexes</TooltipContent>
              </Tooltip>
              <Separator orientation="vertical" className="h-4" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1">
                    <ChatIcon className="h-4 w-4" />
                    {ai.conversationCount} conversations
                  </span>
                </TooltipTrigger>
                <TooltipContent>Conversations totales</TooltipContent>
              </Tooltip>
              <Separator orientation="vertical" className="h-4" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1">
                    <QuestionIcon className="h-4 w-4" />
                    {ai.questionCount} questions
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
                  isLoading={isChatLoading}
                  welcomeMessage={ai.welcomeMessage}
                  aiName={ai.name}
                  primaryColor={ai.primaryColor}
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
                    {ai.documentCount} document(s) dans la base de connaissances
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {ai.documentCount === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <DocumentIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Aucun document indexe</p>
                      <p className="text-sm">
                        Ajoutez des documents pour enrichir votre assistant.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Liste des documents a implementer...
                    </p>
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
                      <div className="text-2xl font-bold">{ai.conversationCount}</div>
                      <p className="text-sm text-muted-foreground">Conversations</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{ai.questionCount}</div>
                      <p className="text-sm text-muted-foreground">Questions</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{ai.documentCount}</div>
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

// Icons
function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function QuestionIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
      <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
    </svg>
  );
}

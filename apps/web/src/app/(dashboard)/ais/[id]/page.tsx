'use client';

import * as React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Button,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Card,
  CardContent,
  TooltipProvider,
  ShareModal,
  NotificationBar,
  type NotificationBarItem,
  type Conversation,
} from '@corpusai/ui';
import dynamic from 'next/dynamic';
import { useAI, useConversations, useDocuments } from '@/lib/queries';
import { useNavigation } from '@/lib/hooks';
import { useChatState, useDocumentUpload } from './hooks';
import { AIHeader, ChatTab, ConversationsTab } from './components';

const DocumentsTab = dynamic(() =>
  import('./components/documents-tab').then((m) => ({ default: m.DocumentsTab }))
);
const AnalyticsTab = dynamic(() =>
  import('./components/analytics-tab').then((m) => ({ default: m.AnalyticsTab }))
);
const DebugTab = dynamic(() =>
  import('./components/debug-tab').then((m) => ({ default: m.DebugTab }))
);
const IntegrationTab = dynamic(() =>
  import('./components/integration-tab').then((m) => ({ default: m.IntegrationTab }))
);
import type { AI } from '@corpusai/types';
import { PageWrapper } from '@/components/page-wrapper';

export default function AIDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const aiId = params.id as string;
  const { goToAIList, goToAISettings } = useNavigation();

  const [showChecklist, setShowChecklist] = React.useState(
    searchParams.get('fromOnboarding') === 'true'
  );
  const [activeTab, setActiveTab] = React.useState('chat');

  // Data fetching
  const { data: ai, isLoading: isLoadingAI } = useAI(aiId);
  const { data: conversationsData, isLoading: isLoadingConversations } = useConversations(
    aiId,
    'DASHBOARD'
  );
  const { data: documents, isLoading: isLoadingDocuments } = useDocuments(aiId);

  const aiData = ai as AI | undefined;

  // Chat state management
  const {
    messages,
    currentConversationId,
    isStreaming,
    sendMessage,
    selectConversation,
    startNewConversation,
  } = useChatState({ aiSlug: aiData?.slug || '' });

  // Document upload management
  const { uploadedFiles, uploadFiles, removeFile, deleteIndexedDocument, retryFailedDocument } =
    useDocumentUpload({ aiId, documents });

  // Transform conversations data to UI format
  const conversations: Conversation[] = React.useMemo(() => {
    if (!conversationsData) return [];
    return conversationsData
      .filter((conv) => conv.messageCount > 0)
      .map((conv) => ({
        id: conv.id,
        title: conv.title || 'Nouvelle conversation',
        lastMessage: conv.lastMessage || '',
        messageCount: conv.messageCount,
        createdAt: new Date(conv.createdAt),
        updatedAt: new Date(conv.updatedAt),
      }));
  }, [conversationsData]);

  // Generate dynamic welcome message from indexed documents
  const welcomeMessage = React.useMemo(() => {
    if (aiData?.welcomeMessage) return aiData.welcomeMessage;
    if (!documents || documents.length === 0) return undefined;

    const indexedDocs = documents.filter((d: { status: string }) => d.status === 'INDEXED');
    if (indexedDocs.length === 0) return undefined;

    const docList = indexedDocs
      .slice(0, 5)
      .map(
        (d: { filename: string }) => `• ${d.filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')}`
      )
      .join('\n');

    return `Salut ! Je suis documenté sur ces sujets :\n${docList}${indexedDocs.length > 5 ? `\n• ...et ${indexedDocs.length - 5} autres` : ''}\n\nPose-moi une question, même en dehors de ces sujets !`;
  }, [aiData?.welcomeMessage, documents]);

  // Share modal state
  const [shareOpen, setShareOpen] = React.useState(false);

  // Handlers
  const handleConversationSelect = React.useCallback(
    (conversation: Conversation) => {
      selectConversation(conversation.id);
    },
    [selectConversation]
  );

  const handleSettings = React.useCallback(() => {
    goToAISettings(aiId);
  }, [aiId, goToAISettings]);

  const checklistItems = React.useMemo((): NotificationBarItem[] => {
    const documentCount = (aiData as AI | undefined)?.documentCount ?? 0;
    return [
      { icon: 'check', label: 'IA créée' },
      documentCount > 0
        ? { icon: 'check', label: 'Documents indexés' }
        : {
            icon: 'arrow',
            label: 'Ajoutez des documents',
            onClick: () => {
              setActiveTab('documents');
              setShowChecklist(false);
            },
          },
      { icon: 'arrow', label: 'Comportement', onClick: () => goToAISettings(aiId) },
      {
        icon: 'arrow',
        label: 'Intégration',
        onClick: () => {
          setActiveTab('integration');
          setShowChecklist(false);
        },
      },
    ];
  }, [(aiData as AI | undefined)?.documentCount, aiId, goToAISettings]);

  const handleShare = React.useCallback(() => {
    setShareOpen(true);
  }, []);

  // Loading state
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

  // Not found state
  if (!aiData) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Assistant introuvable</p>
            <Button className="mt-4" onClick={goToAIList}>
              Retour a la liste
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <PageWrapper className="container py-8">
        <AIHeader ai={aiData} onSettings={handleSettings} onShare={handleShare} />

        {showChecklist && (
          <NotificationBar
            title="Votre assistant est prêt !"
            items={checklistItems}
            onClose={() => setShowChecklist(false)}
            className="mb-2 mt-4"
          />
        )}

        <ShareModal
          open={shareOpen}
          onOpenChange={setShareOpen}
          ai={{
            slug: aiData.slug,
            name: aiData.name,
            primaryColor: aiData.primaryColor ?? undefined,
          }}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="conversations">Historique</TabsTrigger>
            <TabsTrigger value="analytics">Analytiques</TabsTrigger>
            <TabsTrigger value="integration">Intégration</TabsTrigger>
            <TabsTrigger value="debug">Debug</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-0">
            <ChatTab
              messages={messages}
              conversations={conversations}
              currentConversationId={currentConversationId}
              isLoadingConversations={isLoadingConversations}
              isStreaming={isStreaming}
              aiName={aiData.name}
              welcomeMessage={welcomeMessage}
              onSendMessage={sendMessage}
              onSelectConversation={handleConversationSelect}
              onNewConversation={currentConversationId !== null ? startNewConversation : undefined}
            />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentsTab
              documents={documents}
              documentCount={aiData.documentCount}
              isLoading={isLoadingDocuments}
              uploadedFiles={uploadedFiles}
              onFilesSelected={uploadFiles}
              onFileRemove={removeFile}
              onDeleteDocument={deleteIndexedDocument}
              onRetryDocument={retryFailedDocument}
            />
          </TabsContent>

          <TabsContent value="conversations">
            <ConversationsTab
              conversations={conversations}
              currentConversationId={currentConversationId}
              isLoading={isLoadingConversations}
              onSelectConversation={handleConversationSelect}
              onNewConversation={currentConversationId !== null ? startNewConversation : undefined}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsTab aiId={aiId} />
          </TabsContent>

          <TabsContent value="integration">
            <IntegrationTab ai={aiData} />
          </TabsContent>

          <TabsContent value="debug">
            <DebugTab aiId={aiId} />
          </TabsContent>
        </Tabs>
      </PageWrapper>
    </TooltipProvider>
  );
}

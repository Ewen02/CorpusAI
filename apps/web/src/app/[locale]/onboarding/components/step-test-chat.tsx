import * as React from 'react';
import { FileText } from 'lucide-react';
import { Button, Card, CardContent, ChatInterface } from '@corpusai/ui';
import { useChatState } from '@/app/[locale]/(dashboard)/ais/[id]/hooks/use-chat-state';
import type { CreatedAI } from './step-create-ai';
import { IndexingBanner } from './indexing-banner';

interface StepTestChatProps {
  ai: CreatedAI;
  hasDocuments: boolean;
  isIndexing: boolean;
  indexedCount: number;
  totalCount: number;
  indexingProgress: number;
  onNext: () => void;
  onBack: () => void;
}

export function StepTestChat({
  ai,
  totalCount,
  isIndexing,
  indexedCount,
  indexingProgress,
  onNext,
  onBack,
}: StepTestChatProps) {
  const { messages, isStreaming, sendMessage } = useChatState({ aiSlug: ai.slug });

  if (totalCount === 0) {
    return (
      <div className="space-y-6">
        <StepHeader />
        <Card className="surface-raised">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <FileText className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-[hsl(var(--text-primary))]">
                Aucun document indexé
              </p>
              <p className="text-sm text-[hsl(var(--text-muted))]">
                Ajoutez un document pour que votre assistant puisse répondre à vos questions.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onBack}>
              ← Ajouter un document
            </Button>
          </CardContent>
        </Card>
        <Button variant="ghost" className="w-full text-[hsl(var(--text-muted))]" onClick={onNext}>
          Continuer sans document
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-[hsl(var(--text-primary))]">
          Testez votre assistant
        </h2>
        <p className="text-sm text-[hsl(var(--text-muted))]">
          Posez une question pour voir votre IA en action.
        </p>
        {isIndexing && (
          <p className="text-xs text-amber-400/80">
            Vos documents sont encore en cours d'indexation — les réponses s'amélioreront dans
            quelques instants.
          </p>
        )}
      </div>

      <IndexingBanner indexed={indexedCount} total={totalCount} progress={indexingProgress} />

      <Card className="surface-raised overflow-hidden">
        <ChatInterface
          messages={messages}
          onSendMessage={sendMessage}
          isLoading={isStreaming}
          aiName={ai.name}
          welcomeMessage={`Bonjour ! Je suis ${ai.name}. Comment puis-je vous aider ?`}
          className="h-[380px]"
        />
      </Card>

      <Button size="lg" className="bg-gradient-primary w-full" onClick={onNext}>
        Continuer
      </Button>
    </div>
  );
}

function StepHeader() {
  return (
    <div className="space-y-1">
      <h2 className="text-2xl font-bold tracking-tight text-[hsl(var(--text-primary))]">
        Testez votre assistant
      </h2>
      <p className="text-sm text-[hsl(var(--text-muted))]">
        Posez une question pour voir votre IA en action.
      </p>
    </div>
  );
}

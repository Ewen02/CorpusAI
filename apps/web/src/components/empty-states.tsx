'use client';

import { Button, Card, CardContent } from '@corpusai/ui';
import { BotIcon, PlusIcon } from '@/lib/icons';

interface EmptyAIStateProps {
  onCreateAI: () => void;
}

export function EmptyAIState({ onCreateAI }: EmptyAIStateProps) {
  return (
    <Card variant="glass" className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-10">
        <div className="rounded-full bg-primary/10 p-3 mb-4 animate-pulse-slow">
          <BotIcon className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-semibold mb-1">Aucun AI cree</h3>
        <p className="text-sm text-muted-foreground text-center mb-4">
          Creez votre premier assistant IA pour commencer
        </p>
        <Button variant="glow" onClick={onCreateAI}>Creer un AI</Button>
      </CardContent>
    </Card>
  );
}

interface EmptyAIStateFullProps {
  onCreateAI: () => void;
}

export function EmptyAIStateFull({ onCreateAI }: EmptyAIStateFullProps) {
  return (
    <Card variant="glass" className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-primary/10 p-4 mb-4 animate-pulse-slow">
          <BotIcon className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Aucun AI cree</h3>
        <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
          Creez votre premier assistant IA en quelques minutes. Uploadez vos
          documents et laissez l'IA repondre aux questions.
        </p>
        <Button variant="glow" onClick={onCreateAI} size="lg">
          <PlusIcon className="h-4 w-4 mr-2" />
          Creer mon premier AI
        </Button>
      </CardContent>
    </Card>
  );
}

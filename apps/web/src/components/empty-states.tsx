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
        <div className="mb-4 animate-pulse-slow rounded-full bg-primary/10 p-3">
          <BotIcon className="h-6 w-6 text-primary" />
        </div>
        <h3 className="mb-1 font-semibold">Aucun AI cree</h3>
        <p className="mb-4 text-center text-sm text-muted-foreground">
          Creez votre premier assistant IA pour commencer
        </p>
        <Button variant="default" onClick={onCreateAI}>
          Creer un AI
        </Button>
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
        <div className="mb-4 animate-pulse-slow rounded-full bg-primary/10 p-4">
          <BotIcon className="h-8 w-8 text-primary" />
        </div>
        <h3 className="mb-1 text-lg font-semibold">Aucun AI cree</h3>
        <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
          Creez votre premier assistant IA en quelques minutes. Uploadez vos documents et laissez
          l'IA repondre aux questions.
        </p>
        <Button variant="default" onClick={onCreateAI} size="lg">
          <PlusIcon className="mr-2 h-4 w-4" />
          Creer mon premier AI
        </Button>
      </CardContent>
    </Card>
  );
}

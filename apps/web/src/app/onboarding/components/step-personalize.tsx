import * as React from 'react';
import { Button, Card, CardContent, Input, Label, Textarea } from '@corpusai/ui';
import { apiClient } from '@/lib/api-client';
import type { CreatedAI } from './step-create-ai';

interface StepPersonalizeProps {
  ai: CreatedAI;
  onNext: () => void;
  onSkip: () => void;
}

export function StepPersonalize({ ai, onNext, onSkip }: StepPersonalizeProps) {
  const defaultSystemPrompt = `Tu es ${ai.name}${ai.description ? `, spécialisé dans ${ai.description}` : ''}. Tu réponds uniquement à partir des documents fournis.`;
  const defaultWelcomeMessage = `Bonjour ! Je suis ${ai.name}. Comment puis-je vous aider ?`;

  const [systemPrompt, setSystemPrompt] = React.useState(defaultSystemPrompt);
  const [welcomeMessage, setWelcomeMessage] = React.useState(defaultWelcomeMessage);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleContinue = React.useCallback(async () => {
    setIsLoading(true);
    try {
      await apiClient.patch(`/ais/${ai.id}`, {
        systemPrompt: systemPrompt.trim() || undefined,
        welcomeMessage: welcomeMessage.trim() || undefined,
      });
    } catch {
      // Non-critical — proceed regardless
    } finally {
      setIsLoading(false);
      onNext();
    }
  }, [ai.id, systemPrompt, welcomeMessage, onNext]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-[hsl(var(--text-primary))]">
          Personnalisez votre assistant
        </h2>
        <p className="text-sm text-[hsl(var(--text-muted))]">
          Définissez comment il se comporte et comment il se présente.
        </p>
      </div>

      <Card className="surface-raised">
        <CardContent className="space-y-5 pt-6">
          <div className="space-y-2">
            <Label htmlFor="system-prompt">Comportement</Label>
            <Textarea
              id="system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={4}
              maxLength={4000}
              placeholder="Tu es un assistant spécialisé dans [nom]. Tu réponds uniquement à partir des documents fournis. Tu es direct et précis."
            />
            <p className="text-right text-xs text-[hsl(var(--text-muted))]">
              {systemPrompt.length}/4000
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="welcome-message">Message d&apos;accueil</Label>
            <Input
              id="welcome-message"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              maxLength={500}
              placeholder="Bonjour ! Comment puis-je vous aider ?"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          className="bg-gradient-primary w-full"
          onClick={handleContinue}
          disabled={isLoading}
        >
          {isLoading ? 'Enregistrement…' : 'Continuer'}
        </Button>
        <Button variant="ghost" className="w-full text-[hsl(var(--text-muted))]" onClick={onSkip}>
          Passer cette étape
        </Button>
      </div>
    </div>
  );
}

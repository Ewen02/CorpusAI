import * as React from 'react';
import { FileText, MessageSquare, Upload } from 'lucide-react';
import { Button } from '@corpusai/ui';

interface StepWelcomeProps {
  firstName: string;
  onNext: () => void;
}

const WELCOME_FEATURES = [
  {
    title: 'Importez vos documents',
    description: 'PDF, Word, texte… Tous vos fichiers deviennent une base de connaissances.',
    icon: FileText,
  },
  {
    title: 'Posez des questions',
    description: 'Votre IA répond instantanément en se basant sur vos documents.',
    icon: MessageSquare,
  },
  {
    title: 'Partagez avec le monde',
    description: 'Intégrez votre assistant sur votre site ou partagez-le publiquement.',
    icon: Upload,
  },
];

export function StepWelcome({ firstName, onNext }: StepWelcomeProps) {
  return (
    <div className="space-y-8 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <MessageSquare className="h-10 w-10 text-primary" />
      </div>

      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--text-primary))]">
          Bienvenue, <span className="text-gradient-accent">{firstName}</span> !
        </h1>
        <p className="text-[hsl(var(--text-muted))]">
          Transformez vos documents en assistants IA intelligents en quelques minutes.
        </p>
      </div>

      <div className="grid gap-3 text-left">
        {WELCOME_FEATURES.map((feature) => (
          <div key={feature.title} className="surface-raised flex items-start gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <feature.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[hsl(var(--text-primary))]">
                {feature.title}
              </h3>
              <p className="text-sm text-[hsl(var(--text-muted))]">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <Button size="lg" className="bg-gradient-primary w-full" onClick={onNext}>
          Commencer
        </Button>
        <Button
          variant="ghost"
          className="w-full text-[hsl(var(--text-muted))]"
          onClick={() => window.location.replace('/dashboard')}
        >
          Explorer le dashboard
        </Button>
      </div>
    </div>
  );
}

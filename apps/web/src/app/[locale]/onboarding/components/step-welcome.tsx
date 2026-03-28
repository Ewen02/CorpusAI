import * as React from 'react';
import { FileText, MessageSquare, Upload } from 'lucide-react';
import { Button } from '@corpusai/ui';
import { useTranslations } from 'next-intl';

interface StepWelcomeProps {
  firstName: string;
  onNext: () => void;
}

export function StepWelcome({ firstName, onNext }: StepWelcomeProps) {
  const t = useTranslations('onboarding.welcome');

  const features = [
    {
      title: t('featureImportTitle'),
      description: t('featureImportDesc'),
      icon: FileText,
    },
    {
      title: t('featureAskTitle'),
      description: t('featureAskDesc'),
      icon: MessageSquare,
    },
    {
      title: t('featureShareTitle'),
      description: t('featureShareDesc'),
      icon: Upload,
    },
  ];

  return (
    <div className="space-y-8 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <MessageSquare className="h-10 w-10 text-primary" />
      </div>

      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--text-primary))]">
          {t('title', { firstName })}
        </h1>
        <p className="text-[hsl(var(--text-muted))]">{t('subtitle')}</p>
      </div>

      <div className="grid gap-3 text-left">
        {features.map((feature) => (
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
          {t('start')}
        </Button>
        <Button
          variant="ghost"
          className="w-full text-[hsl(var(--text-muted))]"
          onClick={() => window.location.replace('/dashboard')}
        >
          {t('exploreDashboard')}
        </Button>
      </div>
    </div>
  );
}

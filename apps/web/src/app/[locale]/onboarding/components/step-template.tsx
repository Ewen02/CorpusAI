'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@corpusai/ui';
import { Headphones, GraduationCap, Scale, TrendingUp, Heart, Code, Sparkles } from 'lucide-react';
import { AI_TEMPLATES, type AITemplate } from '../templates';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Headphones,
  GraduationCap,
  Scale,
  TrendingUp,
  Heart,
  Code,
  Sparkles,
};

export interface TemplateSelection {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  welcomeMessage: string;
  category: string;
}

interface StepTemplateProps {
  onSelect: (template: TemplateSelection | null) => void;
  onSkip: () => void;
}

export function StepTemplate({ onSelect, onSkip }: StepTemplateProps) {
  const t = useTranslations('onboarding.templates');

  const handleSelect = (template: AITemplate) => {
    if (template.id === 'custom') {
      onSelect(null);
      return;
    }

    onSelect({
      id: template.id,
      name: t(`${template.id}.name`),
      description: t(`${template.id}.description`),
      systemPrompt: t(`${template.id}.systemPrompt`),
      welcomeMessage: t(`${template.id}.welcomeMessage`),
      category: template.category,
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-[hsl(var(--text-primary))]">
          {t('title')}
        </h2>
        <p className="text-sm text-[hsl(var(--text-muted))]">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {AI_TEMPLATES.map((template) => {
          const Icon = ICON_MAP[template.icon] ?? Sparkles;
          const isCustom = template.id === 'custom';

          return (
            <button
              key={template.id}
              onClick={() => handleSelect(template)}
              className={`group flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all duration-150 hover:shadow-md ${
                isCustom
                  ? 'border-dashed border-[hsl(var(--border-default))] hover:border-[hsl(var(--accent-500)/0.4)] hover:bg-[hsl(var(--accent-500)/0.04)]'
                  : 'border-[hsl(var(--border-subtle))] bg-[hsl(var(--surface-1))] hover:border-[hsl(var(--accent-500)/0.3)] hover:bg-[hsl(var(--surface-1))]'
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${template.color} shadow-sm`}
              >
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[hsl(var(--text-primary))]">
                  {t(`${template.id}.name`)}
                </p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-[hsl(var(--text-muted))]">
                  {t(`${template.id}.description`)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <Button variant="ghost" className="w-full text-[hsl(var(--text-muted))]" onClick={onSkip}>
        {t('skip')}
      </Button>
    </div>
  );
}

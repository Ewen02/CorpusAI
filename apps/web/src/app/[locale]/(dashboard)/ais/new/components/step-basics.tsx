'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input, Textarea } from '@corpusai/ui';
import {
  BookOpen,
  GraduationCap,
  Headphones,
  Sparkles,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { ErrorAlert } from '@/components';
import {
  CATEGORY_ICONS,
  SYSTEM_PROMPT_TEMPLATES,
  WIZARD_CATEGORIES,
  type WizardCategoryId,
} from '../constants';
import type { WizardState } from '../hooks/use-wizard-state';

const ICON_MAP: Record<string, LucideIcon> = {
  Headphones,
  BookOpen,
  GraduationCap,
  Wrench,
  Sparkles,
};

interface StepBasicsProps {
  state: WizardState;
  patch: (delta: Partial<WizardState>) => void;
  onNext: () => void;
  onCancel: () => void;
  errors: Partial<Record<'name' | 'description' | 'systemPrompt', string>>;
}

export function StepBasics({ state, patch, onNext, onCancel, errors }: StepBasicsProps) {
  const t = useTranslations('aiNewWizard');

  const handleCategory = (category: WizardCategoryId) => {
    // Only auto-fill the system prompt if the user hasn't edited it manually.
    patch({
      category,
      systemPrompt: state.systemPromptTouched
        ? state.systemPrompt
        : SYSTEM_PROMPT_TEMPLATES[category],
    });
  };

  return (
    <div className="space-y-6">
      <section className="glass surface-stat rounded-2xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-6">
        <header className="mb-5">
          <h2 className="text-[15px] font-semibold text-tx-primary">{t('basics.heading')}</h2>
          <p className="mt-0.5 text-[13px] text-tx-muted">{t('basics.subheading')}</p>
        </header>

        <div className="space-y-5">
          <Field
            label={t('basics.nameLabel')}
            htmlFor="ai-name"
            hint={errors.name}
            isError={!!errors.name}
          >
            <Input
              id="ai-name"
              placeholder={t('basics.namePlaceholder')}
              value={state.name}
              maxLength={60}
              onChange={(e) => patch({ name: e.target.value })}
              className="h-9 border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] text-[13px]"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'ai-name-hint' : undefined}
            />
          </Field>

          <Field
            label={t('basics.descriptionLabel')}
            htmlFor="ai-description"
            hint={errors.description ?? t('basics.descriptionHint')}
            isError={!!errors.description}
          >
            <Textarea
              id="ai-description"
              placeholder={t('basics.descriptionPlaceholder')}
              value={state.description}
              maxLength={280}
              rows={3}
              onChange={(e) => patch({ description: e.target.value })}
              className="border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] text-[13px]"
              aria-invalid={!!errors.description}
              aria-describedby="ai-description-hint"
            />
          </Field>

          <div className="space-y-2">
            <label className="text-[13px] font-medium text-tx-secondary">
              {t('basics.categoryLabel')}
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {WIZARD_CATEGORIES.map((id) => {
                const Icon = ICON_MAP[CATEGORY_ICONS[id]] ?? Sparkles;
                const isActive = state.category === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleCategory(id)}
                    aria-pressed={isActive}
                    className={`flex flex-col items-start gap-1.5 rounded-xl border px-3 py-2.5 text-left text-[12.5px] transition-all ${
                      isActive
                        ? 'border-[hsl(var(--accent-500)/0.5)] bg-[hsl(var(--accent-500)/0.08)] text-[hsl(var(--accent-500))] shadow-[0_0_0_1px_hsl(var(--accent-500)/0.25)]'
                        : 'border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] text-tx-secondary hover:border-[hsl(var(--border-strong))] hover:text-tx-primary'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{t(`basics.categories.${id}.name`)}</span>
                    <span className="text-[11px] text-tx-muted">
                      {t(`basics.categories.${id}.hint`)}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[12px] text-tx-disabled">{t('basics.categoryHelp')}</p>
          </div>
        </div>
      </section>

      <section className="glass rounded-2xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-6">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-tx-primary">
              {t('basics.systemPromptHeading')}
            </h2>
            <p className="mt-0.5 text-[13px] text-tx-muted">{t('basics.systemPromptSubheading')}</p>
          </div>
          {state.systemPromptTouched && (
            <button
              type="button"
              className="rounded-md border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] px-2.5 py-1 text-[12px] text-tx-secondary hover:text-tx-primary"
              onClick={() =>
                patch({
                  systemPrompt: SYSTEM_PROMPT_TEMPLATES[state.category],
                  systemPromptTouched: false,
                })
              }
            >
              {t('basics.resetPrompt')}
            </button>
          )}
        </header>

        <Textarea
          id="ai-system-prompt"
          value={state.systemPrompt}
          rows={5}
          maxLength={4000}
          onChange={(e) => patch({ systemPrompt: e.target.value, systemPromptTouched: true })}
          className="border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] text-[13px]"
          aria-invalid={!!errors.systemPrompt}
          aria-describedby="ai-system-prompt-hint"
        />
        {errors.systemPrompt ? (
          <p id="ai-system-prompt-hint" role="alert" className="mt-1 text-[12px] text-red-400">
            {errors.systemPrompt}
          </p>
        ) : (
          <p id="ai-system-prompt-hint" className="mt-1 text-[12px] text-tx-disabled">
            {t('basics.systemPromptHint', { count: state.systemPrompt.length, max: 4000 })}
          </p>
        )}
      </section>

      <ErrorAlert message={null} />

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          {t('actions.cancel')}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onNext}
          disabled={!state.name.trim()}
          className="bg-primary shadow-[0_2px_8px_hsl(var(--accent-500)/0.35)] hover:opacity-90 disabled:opacity-50"
        >
          {t('actions.next')}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  isError,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  isError?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-tx-secondary">
        {label}
      </label>
      {children}
      {hint ? (
        <p
          id={`${htmlFor}-hint`}
          role={isError ? 'alert' : undefined}
          className={isError ? 'text-[12px] text-red-400' : 'text-[12px] text-tx-disabled'}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

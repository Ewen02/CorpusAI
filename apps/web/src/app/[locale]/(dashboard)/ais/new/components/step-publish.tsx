'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input, Textarea } from '@corpusai/ui';
import { Globe, Lock, Sparkles } from 'lucide-react';
import { ErrorAlert } from '@/components';
import { WELCOME_SUGGESTIONS, type AccessMode } from '../constants';
import type { WizardState } from '../hooks/use-wizard-state';

interface StepPublishProps {
  state: WizardState;
  patch: (delta: Partial<WizardState>) => void;
  onBack: () => void;
  onPublish: () => void;
  isSubmitting: boolean;
  errors: Partial<Record<'slug' | 'welcomeMessage', string>>;
  submitError: string | null;
  uploadCount: number;
}

export function StepPublish({
  state,
  patch,
  onBack,
  onPublish,
  isSubmitting,
  errors,
  submitError,
  uploadCount,
}: StepPublishProps) {
  const t = useTranslations('aiNewWizard');
  const suggestions = WELCOME_SUGGESTIONS[state.category];

  const trySuggestion = (idx: number) => {
    const next = suggestions[idx];
    if (next !== undefined) patch({ welcomeMessage: next });
  };

  return (
    <div className="space-y-6">
      <section className="glass surface-stat rounded-2xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-6">
        <header className="mb-5">
          <h2 className="text-[15px] font-semibold text-tx-primary">{t('publish.heading')}</h2>
          <p className="mt-0.5 text-[13px] text-tx-muted">{t('publish.subheading')}</p>
        </header>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="ai-slug" className="text-[13px] font-medium text-tx-secondary">
              {t('publish.slugLabel')}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-tx-disabled">corpusai.app/chat/</span>
              <Input
                id="ai-slug"
                value={state.slug}
                onChange={(e) =>
                  patch({
                    slug: e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, '')
                      .slice(0, 40),
                    slugTouched: true,
                  })
                }
                placeholder="my-assistant"
                pattern="^[a-z0-9-]+$"
                maxLength={40}
                className="h-9 flex-1 border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] text-[13px]"
                aria-invalid={!!errors.slug}
              />
            </div>
            <p className={`text-[12px] ${errors.slug ? 'text-red-400' : 'text-tx-disabled'}`}>
              {errors.slug ?? t('publish.slugHint')}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-tx-secondary">
              {t('publish.accessLabel')}
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <AccessCard
                mode="OPEN"
                active={state.accessMode === 'OPEN'}
                title={t('publish.accessOpen.title')}
                hint={t('publish.accessOpen.hint')}
                onClick={() => patch({ accessMode: 'OPEN' })}
              />
              <AccessCard
                mode="PRIVATE"
                active={state.accessMode === 'PRIVATE'}
                title={t('publish.accessPrivate.title')}
                hint={t('publish.accessPrivate.hint')}
                onClick={() => patch({ accessMode: 'PRIVATE' })}
              />
            </div>
            <p className="text-[12px] text-tx-disabled">{t('publish.accessHelp')}</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="ai-welcome" className="text-[13px] font-medium text-tx-secondary">
                {t('publish.welcomeLabel')}
              </label>
              <button
                type="button"
                onClick={() => trySuggestion(0)}
                className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] px-2.5 py-1 text-[12px] font-medium text-tx-secondary transition-colors hover:border-[hsl(var(--accent-500)/0.4)] hover:text-[hsl(var(--accent-500))]"
              >
                <Sparkles className="h-3 w-3" />
                {t('publish.trySuggestions')}
              </button>
            </div>
            <Textarea
              id="ai-welcome"
              value={state.welcomeMessage}
              rows={3}
              maxLength={280}
              onChange={(e) => patch({ welcomeMessage: e.target.value })}
              className="border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] text-[13px]"
              aria-invalid={!!errors.welcomeMessage}
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => trySuggestion(idx)}
                  className={`max-w-full truncate rounded-full border px-3 py-1 text-[11.5px] transition-colors ${
                    state.welcomeMessage === suggestion
                      ? 'border-[hsl(var(--accent-500)/0.5)] bg-[hsl(var(--accent-500)/0.08)] text-[hsl(var(--accent-500))]'
                      : 'border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] text-tx-secondary hover:border-[hsl(var(--border-strong))] hover:text-tx-primary'
                  }`}
                  title={suggestion}
                >
                  {suggestion.length > 60 ? `${suggestion.slice(0, 60)}…` : suggestion}
                </button>
              ))}
            </div>
            {errors.welcomeMessage && (
              <p className="text-[12px] text-red-400">{errors.welcomeMessage}</p>
            )}
          </div>
        </div>
      </section>

      {uploadCount > 0 && (
        <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] px-4 py-3 text-[12.5px] text-tx-secondary">
          {t('publish.uploadNotice', { count: uploadCount })}
        </div>
      )}

      <ErrorAlert message={submitError} />

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" onClick={onBack} disabled={isSubmitting}>
          {t('actions.back')}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onPublish}
          disabled={isSubmitting || !state.slug.trim() || !state.name.trim()}
          className="bg-primary shadow-[0_2px_8px_hsl(var(--accent-500)/0.35)] hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? t('actions.publishing') : t('actions.publish')}
        </Button>
      </div>
    </div>
  );
}

function AccessCard({
  mode,
  active,
  title,
  hint,
  onClick,
}: {
  mode: AccessMode;
  active: boolean;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  const Icon = mode === 'OPEN' ? Globe : Lock;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col items-start gap-2 rounded-xl border px-4 py-3 text-left transition-all ${
        active
          ? 'border-[hsl(var(--accent-500)/0.5)] bg-[hsl(var(--accent-500)/0.08)] text-[hsl(var(--accent-500))]'
          : 'border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] text-tx-secondary hover:border-[hsl(var(--border-strong))] hover:text-tx-primary'
      }`}
    >
      <Icon className="h-4 w-4" />
      <div>
        <p className="text-[13px] font-semibold">{title}</p>
        <p className="mt-0.5 text-[12px] text-tx-muted">{hint}</p>
      </div>
    </button>
  );
}

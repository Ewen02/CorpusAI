'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Badge, Input, Switch, Textarea, cn } from '@corpusai/ui';
import type { AICategory } from '@corpusai/types';

import { FormAlert } from '@/components/form-alert';
import type { AISuggestions } from '@/lib/queries';

import {
  CARD_CLASS,
  CATEGORY_VALUES,
  INPUT_CLASS,
  SELECT_CLASS,
  STATUS_COLORS,
  STATUS_VALUES,
  TEXTAREA_CLASS,
  type AIStatus,
} from '../constants';
import { GenerateAIButton } from './generate-ai-button';
import { SuggestionHint } from './suggestion-hint';

interface GeneralTabProps {
  aiSlug: string;

  // Form state
  name: string;
  description: string;
  category: AICategory;
  status: AIStatus;
  isPublic: boolean;

  setName: (v: string) => void;
  setDescription: (v: string) => void;
  setCategory: (v: AICategory) => void;
  setStatus: (v: AIStatus) => void;
  setIsPublic: (v: boolean) => void;

  save: (overrides?: { isPublic?: boolean; status?: AIStatus }) => Promise<void>;

  // Suggestions
  suggestions: Partial<AISuggestions>;
  isSuggesting: boolean;
  canGenerateSuggestions: boolean;
  onGenerateSuggestions: () => void;
  acceptSuggestion: (field: keyof AISuggestions) => void;
  dismissSuggestion: (field: keyof AISuggestions) => void;
}

export function GeneralTab({
  aiSlug,
  name,
  description,
  category,
  status,
  isPublic,
  setName,
  setDescription,
  setCategory,
  setStatus,
  setIsPublic,
  save,
  suggestions,
  isSuggesting,
  canGenerateSuggestions,
  onGenerateSuggestions,
  acceptSuggestion,
  dismissSuggestion,
}: GeneralTabProps) {
  const t = useTranslations('aiSettings');

  return (
    <div className="space-y-6">
      {/* Basic info */}
      <div className={CARD_CLASS}>
        <div className="mb-5">
          <p className="text-[15px] font-semibold text-tx-primary">{t('basicInfo.title')}</p>
          <p className="mt-0.5 text-[13px] text-tx-muted">{t('basicInfo.description')}</p>
        </div>

        {!canGenerateSuggestions && (
          <FormAlert variant="info" message={t('basicInfo.suggestionsUnavailable')} />
        )}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-[13px] font-medium text-tx-secondary">
              {t('basicInfo.nameLabel')}
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => save()}
              maxLength={100}
              className={INPUT_CLASS}
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-[13px] font-medium text-tx-secondary">{t('basicInfo.customUrl')}</p>
            <div className="flex items-center gap-2 text-[13px]">
              <span className="text-tx-muted">corpusai.app/chat/</span>
              <code className="rounded-md border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] px-2 py-0.5 font-mono text-[13px] text-tx-primary">
                {aiSlug}
              </code>
            </div>
            <p className="text-[12px] text-tx-disabled">{t('basicInfo.slugImmutable')}</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="description" className="text-[13px] font-medium text-tx-secondary">
                {t('basicInfo.descriptionLabel')}
              </label>
              <GenerateAIButton
                isPending={isSuggesting}
                canGenerate={canGenerateSuggestions}
                onGenerate={onGenerateSuggestions}
              />
            </div>
            <Textarea
              id="description"
              placeholder={suggestions.description ?? t('basicInfo.descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => save()}
              onKeyDown={(e) => {
                if (e.key === 'Tab' && suggestions.description) {
                  e.preventDefault();
                  acceptSuggestion('description');
                }
                if (e.key === 'Escape' && suggestions.description) {
                  dismissSuggestion('description');
                }
              }}
              maxLength={500}
              rows={3}
              className={TEXTAREA_CLASS}
            />
            <SuggestionHint
              suggestion={suggestions.description}
              currentValue={description}
              charLimit={500}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="category" className="text-[13px] font-medium text-tx-secondary">
              {t('basicInfo.categoryLabel')}
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as AICategory)}
              onBlur={() => save()}
              className={SELECT_CLASS}
            >
              {CATEGORY_VALUES.map((val) => (
                <option key={val} value={val}>
                  {t(`categories.${val}`)}
                </option>
              ))}
            </select>
            <p className="text-[12px] text-tx-disabled">{t('basicInfo.categoryHint')}</p>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className={CARD_CLASS}>
        <div className="mb-5">
          <p className="text-[15px] font-semibold text-tx-primary">{t('status.title')}</p>
          <p className="mt-0.5 text-[13px] text-tx-muted">{t('status.description')}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {STATUS_VALUES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setStatus(value);
                save({ status: value });
              }}
              className={cn(
                'rounded-lg border p-4 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-500)/0.5)]',
                status === value
                  ? 'border-[hsl(var(--accent-500)/0.3)] bg-[hsl(var(--accent-500)/0.06)]'
                  : 'border-[hsl(var(--border-default))] hover:border-[hsl(var(--accent-500)/0.2)] hover:bg-[hsl(var(--surface-2))]'
              )}
            >
              <div className="mb-1 flex items-center gap-2">
                <Badge className={STATUS_COLORS[value]}>{t(`statuses.${value}`)}</Badge>
              </div>
              <p className="text-[12px] text-tx-muted">{t(`statusDescriptions.${value}`)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Access (public toggle) */}
      <div className={CARD_CLASS}>
        <div className="mb-5">
          <p className="text-[15px] font-semibold text-tx-primary">{t('accessSection.title')}</p>
          <p className="mt-0.5 text-[13px] text-tx-muted">{t('accessSection.description')}</p>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] px-4 py-3">
          <div>
            <p className="text-[13px] font-medium text-tx-primary">
              {t('accessSection.publicAccess')}
            </p>
            <p className="mt-0.5 text-[12px] text-tx-disabled">
              {t('accessSection.publicAccessHint')}
            </p>
          </div>
          <Switch
            checked={isPublic}
            onCheckedChange={(v) => {
              setIsPublic(v);
              save({ isPublic: v });
            }}
          />
        </div>
      </div>
    </div>
  );
}

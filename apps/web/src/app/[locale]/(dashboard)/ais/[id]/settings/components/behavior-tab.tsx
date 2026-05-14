'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Textarea } from '@corpusai/ui';

import { FormAlert } from '@/components/form-alert';
import type { AISuggestions } from '@/lib/queries';

import { CARD_CLASS, SELECT_CLASS, TEXTAREA_CLASS } from '../constants';
import { GenerateAIButton } from './generate-ai-button';
import { SuggestionHint } from './suggestion-hint';

interface BehaviorTabProps {
  systemPrompt: string;
  welcomeMessage: string;
  language: 'fr' | 'en';
  llmModel: string;
  maxTokens: number;
  temperature: number;
  scoreThreshold: number;

  setSystemPrompt: (v: string) => void;
  setWelcomeMessage: (v: string) => void;
  setLanguage: (v: 'fr' | 'en') => void;
  setLlmModel: (v: string) => void;
  setMaxTokens: (v: number) => void;
  setTemperature: (v: number) => void;
  setScoreThreshold: (v: number) => void;

  save: () => Promise<void>;

  suggestions: Partial<AISuggestions>;
  isSuggesting: boolean;
  canGenerateSuggestions: boolean;
  onGenerateSuggestions: () => void;
  acceptSuggestion: (field: keyof AISuggestions) => void;
  dismissSuggestion: (field: keyof AISuggestions) => void;
}

export function BehaviorTab({
  systemPrompt,
  welcomeMessage,
  language,
  llmModel,
  maxTokens,
  temperature,
  scoreThreshold,
  setSystemPrompt,
  setWelcomeMessage,
  setLanguage,
  setLlmModel,
  setMaxTokens,
  setTemperature,
  setScoreThreshold,
  save,
  suggestions,
  isSuggesting,
  canGenerateSuggestions,
  onGenerateSuggestions,
  acceptSuggestion,
  dismissSuggestion,
}: BehaviorTabProps) {
  const t = useTranslations('aiSettings');

  return (
    <div className="space-y-6">
      {!canGenerateSuggestions && (
        <FormAlert variant="info" message={t('basicInfo.suggestionsUnavailable')} />
      )}

      {/* System prompt + welcome message */}
      <div className={CARD_CLASS}>
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[15px] font-semibold text-tx-primary">
              {t('behaviorTab.systemPrompt')}
            </p>
            <p className="mt-0.5 text-[13px] text-tx-muted">
              {t('behaviorTab.systemPromptDescription')}
            </p>
          </div>
          <GenerateAIButton
            isPending={isSuggesting}
            canGenerate={canGenerateSuggestions}
            onGenerate={onGenerateSuggestions}
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="systemPrompt" className="text-[13px] font-medium text-tx-secondary">
              {t('behaviorTab.instructionsLabel')}
            </label>
            <Textarea
              id="systemPrompt"
              placeholder={suggestions.systemPrompt ?? t('behaviorTab.systemPromptPlaceholder')}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              onBlur={() => save()}
              onKeyDown={(e) => {
                if (e.key === 'Tab' && suggestions.systemPrompt) {
                  e.preventDefault();
                  acceptSuggestion('systemPrompt');
                }
                if (e.key === 'Escape' && suggestions.systemPrompt) {
                  dismissSuggestion('systemPrompt');
                }
              }}
              maxLength={4000}
              rows={6}
              className={TEXTAREA_CLASS}
            />
            <SuggestionHint
              suggestion={suggestions.systemPrompt}
              currentValue={systemPrompt}
              charLimit={4000}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="welcomeMessage" className="text-[13px] font-medium text-tx-secondary">
              {t('behaviorTab.welcomeMessageLabel')}
            </label>
            <Textarea
              id="welcomeMessage"
              placeholder={suggestions.welcomeMessage ?? t('behaviorTab.welcomeMessagePlaceholder')}
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              onBlur={() => save()}
              onKeyDown={(e) => {
                if (e.key === 'Tab' && suggestions.welcomeMessage) {
                  e.preventDefault();
                  acceptSuggestion('welcomeMessage');
                }
                if (e.key === 'Escape' && suggestions.welcomeMessage) {
                  dismissSuggestion('welcomeMessage');
                }
              }}
              maxLength={500}
              rows={2}
              className={TEXTAREA_CLASS}
            />
            <SuggestionHint
              suggestion={suggestions.welcomeMessage}
              currentValue={welcomeMessage}
              charLimit={500}
            />
          </div>
        </div>
      </div>

      {/* Advanced settings */}
      <div className={CARD_CLASS}>
        <div className="mb-5">
          <p className="text-[15px] font-semibold text-tx-primary">
            {t('behaviorTab.advancedSettings')}
          </p>
          <p className="mt-0.5 text-[13px] text-tx-muted">{t('behaviorTab.advancedDescription')}</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-1.5">
            <label htmlFor="language" className="text-[13px] font-medium text-tx-secondary">
              {t('behaviorTab.responseLanguage')}
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'fr' | 'en')}
              onBlur={() => save()}
              className={SELECT_CLASS}
            >
              <option value="fr">{t('behaviorTab.french')}</option>
              <option value="en">{t('behaviorTab.english')}</option>
            </select>
            <p className="text-[12px] text-tx-disabled">{t('behaviorTab.responseLanguageHint')}</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="llmModel" className="text-[13px] font-medium text-tx-secondary">
              {t('behaviorTab.model')}
            </label>
            <select
              id="llmModel"
              value={llmModel}
              onChange={(e) => {
                setLlmModel(e.target.value);
                save();
              }}
              className="w-full rounded-md border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] px-3 py-2 text-[13px] text-tx-primary"
            >
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="mistral-large-latest">Mistral Large</option>
              <option value="mistral-small-latest">Mistral Small</option>
            </select>
            <p className="text-[12px] text-tx-disabled">{t('behaviorTab.modelHint')}</p>
          </div>

          <SliderField
            id="maxTokens"
            label={t('behaviorTab.maxTokens')}
            hint={t('behaviorTab.maxTokensHint')}
            min={100}
            max={4096}
            step={100}
            value={maxTokens}
            displayValue={String(maxTokens)}
            onChange={setMaxTokens}
            onCommit={save}
          />

          <SliderField
            id="temperature"
            label={t('behaviorTab.temperature')}
            hint={t('behaviorTab.temperatureHint')}
            min={0}
            max={1}
            step={0.1}
            value={temperature}
            displayValue={temperature.toFixed(1)}
            onChange={setTemperature}
            onCommit={save}
          />

          <SliderField
            id="scoreThreshold"
            label={t('behaviorTab.ragThreshold')}
            hint={t('behaviorTab.ragThresholdHint')}
            min={0.3}
            max={0.9}
            step={0.1}
            value={scoreThreshold}
            displayValue={scoreThreshold.toFixed(1)}
            onChange={setScoreThreshold}
            onCommit={save}
          />
        </div>
      </div>
    </div>
  );
}

interface SliderFieldProps {
  id: string;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  value: number;
  displayValue: string;
  onChange: (v: number) => void;
  onCommit: () => void;
}

function SliderField({
  id,
  label,
  hint,
  min,
  max,
  step,
  value,
  displayValue,
  onChange,
  onCommit,
}: SliderFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-[13px] font-medium text-tx-secondary">
          {label}
        </label>
        <span className="rounded-md border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] px-1.5 py-0.5 text-[12px] tabular-nums text-tx-muted">
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        id={id}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onBlur={onCommit}
        className="w-full accent-indigo-500"
      />
      <p className="text-[12px] text-tx-disabled">{hint}</p>
    </div>
  );
}

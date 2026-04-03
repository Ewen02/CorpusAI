'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Input, Textarea, Switch } from '@corpusai/ui';
import { AICategory } from '@corpusai/types';

const CATEGORY_VALUES: AICategory[] = [
  'SUPPORT',
  'EDUCATION',
  'LEGAL',
  'FINANCE',
  'HEALTH',
  'TECH',
  'OTHER',
];

export interface AIFormValues {
  name: string;
  description: string;
  systemPrompt: string;
  welcomeMessage: string;
  primaryColor: string;
  isPublic: boolean;
  category: AICategory;
  maxTokens: number;
  temperature: number;
  language: 'fr' | 'en';
  memoryEnabled: boolean;
}

export const DEFAULT_AI_FORM_VALUES: AIFormValues = {
  name: '',
  description: '',
  systemPrompt: '',
  welcomeMessage: "Bonjour ! Comment puis-je vous aider aujourd'hui ?",
  primaryColor: '#3b82f6',
  isPublic: true,
  category: 'OTHER',
  maxTokens: 1024,
  temperature: 0.7,
  language: 'fr',
  memoryEnabled: false,
};

interface AIFormFieldsProps {
  values: AIFormValues;
  onChange: <K extends keyof AIFormValues>(field: K, value: AIFormValues[K]) => void;
  showSlug?: boolean;
  slug?: string;
  onSlugChange?: (value: string) => void;
  readOnlySlug?: string;
}

export function AIFormFields({
  values,
  onChange,
  showSlug,
  slug,
  onSlugChange,
  readOnlySlug,
}: AIFormFieldsProps) {
  return {
    general: (
      <GeneralFields
        values={values}
        onChange={onChange}
        showSlug={showSlug}
        slug={slug}
        onSlugChange={onSlugChange}
        readOnlySlug={readOnlySlug}
      />
    ),
    behavior: <BehaviorFields values={values} onChange={onChange} />,
    appearance: <AppearanceFields values={values} onChange={onChange} />,
  };
}

// ============================================
// Input class helpers
// ============================================

const inputClass =
  'h-9 w-full rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] px-3 text-[13px] text-tx-primary placeholder:text-tx-disabled focus:border-[hsl(var(--accent-500)/0.4)] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--accent-500)/0.15)]';

// ============================================
// GeneralFields
// ============================================

function GeneralFields({
  values,
  onChange,
  showSlug,
  slug,
  onSlugChange,
  readOnlySlug,
}: Pick<
  AIFormFieldsProps,
  'values' | 'onChange' | 'showSlug' | 'slug' | 'onSlugChange' | 'readOnlySlug'
>) {
  const t = useTranslations('aiForm');
  return (
    <>
      {/* Informations de base */}
      <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-5">
        <div className="mb-5">
          <p className="text-[15px] font-semibold text-tx-primary">{t('basicInfo')}</p>
          <p className="mt-0.5 text-[13px] text-tx-muted">
            {showSlug ? t('basicInfoDescriptionCreate') : t('basicInfoDescriptionEdit')}
          </p>
        </div>

        <div className="space-y-4">
          {/* Nom */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-tx-secondary" htmlFor="name">
              {t('assistantName')} {showSlug && <span className="text-indigo-400">*</span>}
            </label>
            <Input
              id="name"
              placeholder={t('namePlaceholder')}
              value={values.name}
              onChange={(e) => onChange('name', e.target.value)}
              required={showSlug}
              maxLength={100}
              className="h-9 border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] text-[13px] text-tx-primary placeholder:text-tx-disabled focus:border-[hsl(var(--accent-500)/0.4)] focus:ring-1 focus:ring-[hsl(var(--accent-500)/0.15)]"
            />
          </div>

          {/* Slug */}
          {showSlug && slug !== undefined && onSlugChange && (
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-tx-secondary" htmlFor="slug">
                {t('customUrl')}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-tx-disabled">corpusai.app/chat/</span>
                <Input
                  id="slug"
                  placeholder="faq-support"
                  value={slug}
                  onChange={(e) => onSlugChange(e.target.value)}
                  pattern="^[a-z0-9-]+$"
                  maxLength={50}
                  className="h-9 flex-1 border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] text-[13px] text-tx-primary placeholder:text-tx-disabled focus:border-[hsl(var(--accent-500)/0.4)] focus:ring-1 focus:ring-[hsl(var(--accent-500)/0.15)]"
                />
              </div>
              <p className="text-[12px] text-tx-disabled">{t('slugHint')}</p>
            </div>
          )}

          {readOnlySlug && (
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-tx-secondary">{t('customUrl')}</label>
              <div className="flex items-center gap-2 text-[13px]">
                <span className="text-tx-disabled">corpusai.app/chat/</span>
                <code className="rounded-md border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] px-2 py-0.5 text-tx-secondary">
                  {readOnlySlug}
                </code>
              </div>
              <p className="text-[12px] text-tx-disabled">{t('slugReadonly')}</p>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-tx-secondary" htmlFor="description">
              {t('description')}
            </label>
            <Textarea
              id="description"
              placeholder={t('descriptionPlaceholder')}
              value={values.description}
              onChange={(e) => onChange('description', e.target.value)}
              maxLength={500}
              rows={3}
              className="border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] text-[13px] text-tx-primary placeholder:text-tx-disabled focus:border-[hsl(var(--accent-500)/0.4)] focus:ring-1 focus:ring-[hsl(var(--accent-500)/0.15)]"
            />
            <p className="text-[12px] text-tx-disabled">
              {t('charCount', { count: values.description.length, max: 500 })}
            </p>
          </div>

          {/* Catégorie */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-tx-secondary" htmlFor="category">
              {t('category')}
            </label>
            <select
              id="category"
              value={values.category}
              onChange={(e) => onChange('category', e.target.value as AICategory)}
              className={inputClass}
            >
              {CATEGORY_VALUES.map((catValue) => (
                <option key={catValue} value={catValue}>
                  {t(`categories.${catValue}`)}
                </option>
              ))}
            </select>
            <p className="text-[12px] text-tx-disabled">{t('categoryHint')}</p>
          </div>
        </div>
      </div>

      {/* Accès */}
      <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-5">
        <div className="mb-5">
          <p className="text-[15px] font-semibold text-tx-primary">{t('access')}</p>
          <p className="mt-0.5 text-[13px] text-tx-muted">{t('accessDescription')}</p>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] px-4 py-3">
          <div>
            <p className="text-[13px] font-medium text-tx-primary">{t('publicAccess')}</p>
            <p className="mt-0.5 text-[12px] text-tx-disabled">{t('publicAccessDescription')}</p>
          </div>
          <Switch
            id="public"
            checked={values.isPublic}
            onCheckedChange={(checked) => onChange('isPublic', checked)}
          />
        </div>
      </div>
    </>
  );
}

// ============================================
// BehaviorFields
// ============================================

function BehaviorFields({ values, onChange }: Pick<AIFormFieldsProps, 'values' | 'onChange'>) {
  const t = useTranslations('aiForm');
  return (
    <>
      {/* Prompt système */}
      <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-5">
        <div className="mb-5">
          <p className="text-[15px] font-semibold text-tx-primary">{t('systemPrompt')}</p>
          <p className="mt-0.5 text-[13px] text-tx-muted">{t('systemPromptDescription')}</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-tx-secondary" htmlFor="systemPrompt">
              {t('instructions')}
            </label>
            <Textarea
              id="systemPrompt"
              placeholder={t('systemPromptPlaceholder')}
              value={values.systemPrompt}
              onChange={(e) => onChange('systemPrompt', e.target.value)}
              maxLength={4000}
              rows={6}
              className="border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] text-[13px] text-tx-primary placeholder:text-tx-disabled focus:border-[hsl(var(--accent-500)/0.4)] focus:ring-1 focus:ring-[hsl(var(--accent-500)/0.15)]"
            />
            <p className="text-[12px] text-tx-disabled">
              {t('charCount', { count: values.systemPrompt.length, max: 4000 })}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-tx-secondary" htmlFor="welcomeMessage">
              {t('welcomeMessage')}
            </label>
            <Textarea
              id="welcomeMessage"
              placeholder={t('welcomeMessagePlaceholder')}
              value={values.welcomeMessage}
              onChange={(e) => onChange('welcomeMessage', e.target.value)}
              maxLength={500}
              rows={2}
              className="border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] text-[13px] text-tx-primary placeholder:text-tx-disabled focus:border-[hsl(var(--accent-500)/0.4)] focus:ring-1 focus:ring-[hsl(var(--accent-500)/0.15)]"
            />
          </div>
        </div>
      </div>

      {/* Paramètres avancés */}
      <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-5">
        <div className="mb-5">
          <p className="text-[15px] font-semibold text-tx-primary">{t('advancedSettings')}</p>
          <p className="mt-0.5 text-[13px] text-tx-muted">{t('advancedSettingsDescription')}</p>
        </div>

        <div className="space-y-6">
          {/* language */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-tx-secondary" htmlFor="language">
              {t('responseLanguage')}
            </label>
            <select
              id="language"
              value={values.language}
              onChange={(e) => onChange('language', e.target.value as 'fr' | 'en')}
              className={inputClass}
            >
              <option value="fr">{t('languageFr')}</option>
              <option value="en">{t('languageEn')}</option>
            </select>
            <p className="text-[12px] text-tx-disabled">{t('responseLanguageHint')}</p>
          </div>
          {/* maxTokens */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-medium text-tx-secondary" htmlFor="maxTokens">
                {t('maxTokens')}
              </label>
              <span className="rounded-md border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] px-1.5 py-0.5 text-[12px] tabular-nums text-tx-muted">
                {values.maxTokens}
              </span>
            </div>
            <input
              type="range"
              id="maxTokens"
              min={100}
              max={4096}
              step={100}
              value={values.maxTokens}
              onChange={(e) => onChange('maxTokens', Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <p className="text-[12px] text-tx-disabled">{t('maxTokensHint')}</p>
          </div>

          {/* temperature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-medium text-tx-secondary" htmlFor="temperature">
                {t('temperature')}
              </label>
              <span className="rounded-md border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] px-1.5 py-0.5 text-[12px] tabular-nums text-tx-muted">
                {values.temperature.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              id="temperature"
              min={0}
              max={1}
              step={0.1}
              value={values.temperature}
              onChange={(e) => onChange('temperature', Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <p className="text-[12px] text-tx-disabled">{t('temperatureHint')}</p>
          </div>
        </div>
      </div>

      {/* Mémoire multi-session */}
      <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-tx-primary">{t('memory')}</p>
            <p className="mt-0.5 text-[12px] text-tx-disabled">{t('memoryDescription')}</p>
          </div>
          <Switch
            id="memoryEnabled"
            checked={values.memoryEnabled}
            onCheckedChange={(checked) => onChange('memoryEnabled', checked)}
          />
        </div>
      </div>
    </>
  );
}

// ============================================
// AppearanceFields
// ============================================

function AppearanceFields({ values, onChange }: Pick<AIFormFieldsProps, 'values' | 'onChange'>) {
  const t = useTranslations('aiForm');
  return (
    <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-5">
      <div className="mb-5">
        <p className="text-[15px] font-semibold text-tx-primary">{t('customization')}</p>
        <p className="mt-0.5 text-[13px] text-tx-muted">{t('customizationDescription')}</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-tx-secondary" htmlFor="primaryColor">
            {t('primaryColor')}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              id="primaryColor"
              value={values.primaryColor}
              onChange={(e) => onChange('primaryColor', e.target.value)}
              className="h-9 w-16 cursor-pointer rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-1"
            />
            <Input
              value={values.primaryColor}
              onChange={(e) => onChange('primaryColor', e.target.value)}
              pattern="^#[0-9A-Fa-f]{6}$"
              className="h-9 w-32 border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] font-mono text-[13px] text-tx-primary placeholder:text-tx-disabled focus:border-[hsl(var(--accent-500)/0.4)] focus:ring-1 focus:ring-[hsl(var(--accent-500)/0.15)]"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] p-4">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-tx-disabled">
            {t('preview')}
          </p>
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400/20 to-indigo-600/10 text-[13px] font-semibold text-indigo-400 ring-1 ring-[hsl(var(--accent-500)/0.2)]">
              {values.name ? values.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="flex-1">
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-[hsl(var(--surface-1))] px-3.5 py-2 text-[13px] leading-relaxed text-tx-primary">
                {values.welcomeMessage || 'Bonjour ! Comment puis-je vous aider ?'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

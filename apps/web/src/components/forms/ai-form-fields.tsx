'use client';

import * as React from 'react';
import { Input, Textarea, Switch } from '@corpusai/ui';
import { AICategory } from '@corpusai/types';

const CATEGORY_OPTIONS: { value: AICategory; label: string }[] = [
  { value: 'SUPPORT', label: 'Support client' },
  { value: 'EDUCATION', label: 'Éducation' },
  { value: 'LEGAL', label: 'Juridique' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'HEALTH', label: 'Santé' },
  { value: 'TECH', label: 'Tech' },
  { value: 'OTHER', label: 'Autre' },
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
  return (
    <>
      {/* Informations de base */}
      <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-5">
        <div className="mb-5">
          <p className="text-[15px] font-semibold text-tx-primary">Informations de base</p>
          <p className="mt-0.5 text-[13px] text-tx-muted">
            {showSlug
              ? 'Définissez le nom et la description de votre assistant.'
              : 'Modifiez le nom et la description de votre assistant.'}
          </p>
        </div>

        <div className="space-y-4">
          {/* Nom */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-tx-secondary" htmlFor="name">
              Nom de l&apos;assistant {showSlug && <span className="text-indigo-400">*</span>}
            </label>
            <Input
              id="name"
              placeholder="Ex: FAQ Support Client"
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
                URL personnalisée
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
              <p className="text-[12px] text-tx-disabled">
                Lettres minuscules, chiffres et tirets uniquement.
              </p>
            </div>
          )}

          {readOnlySlug && (
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-tx-secondary">URL personnalisée</label>
              <div className="flex items-center gap-2 text-[13px]">
                <span className="text-tx-disabled">corpusai.app/chat/</span>
                <code className="rounded-md border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] px-2 py-0.5 text-tx-secondary">
                  {readOnlySlug}
                </code>
              </div>
              <p className="text-[12px] text-tx-disabled">
                Le slug ne peut pas être modifié après la création.
              </p>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-tx-secondary" htmlFor="description">
              Description
            </label>
            <Textarea
              id="description"
              placeholder="Décrivez ce que fait votre assistant..."
              value={values.description}
              onChange={(e) => onChange('description', e.target.value)}
              maxLength={500}
              rows={3}
              className="border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] text-[13px] text-tx-primary placeholder:text-tx-disabled focus:border-[hsl(var(--accent-500)/0.4)] focus:ring-1 focus:ring-[hsl(var(--accent-500)/0.15)]"
            />
            <p className="text-[12px] text-tx-disabled">
              {values.description.length}/500 caractères
            </p>
          </div>

          {/* Catégorie */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-tx-secondary" htmlFor="category">
              Catégorie
            </label>
            <select
              id="category"
              value={values.category}
              onChange={(e) => onChange('category', e.target.value as AICategory)}
              className={inputClass}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-[12px] text-tx-disabled">
              Aide les utilisateurs à découvrir votre IA sur la marketplace.
            </p>
          </div>
        </div>
      </div>

      {/* Accès */}
      <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-5">
        <div className="mb-5">
          <p className="text-[15px] font-semibold text-tx-primary">Accès</p>
          <p className="mt-0.5 text-[13px] text-tx-muted">
            Définissez qui peut accéder à votre assistant.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] px-4 py-3">
          <div>
            <p className="text-[13px] font-medium text-tx-primary">Accès public</p>
            <p className="mt-0.5 text-[12px] text-tx-disabled">
              Tout le monde peut utiliser cet assistant.
            </p>
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
  return (
    <>
      {/* Prompt système */}
      <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-5">
        <div className="mb-5">
          <p className="text-[15px] font-semibold text-tx-primary">Prompt système</p>
          <p className="mt-0.5 text-[13px] text-tx-muted">
            Instructions de base pour guider le comportement de l&apos;IA.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-tx-secondary" htmlFor="systemPrompt">
              Instructions
            </label>
            <Textarea
              id="systemPrompt"
              placeholder="Tu es un assistant spécialisé dans..."
              value={values.systemPrompt}
              onChange={(e) => onChange('systemPrompt', e.target.value)}
              maxLength={4000}
              rows={6}
              className="border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] text-[13px] text-tx-primary placeholder:text-tx-disabled focus:border-[hsl(var(--accent-500)/0.4)] focus:ring-1 focus:ring-[hsl(var(--accent-500)/0.15)]"
            />
            <p className="text-[12px] text-tx-disabled">
              {values.systemPrompt.length}/4000 caractères
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-tx-secondary" htmlFor="welcomeMessage">
              Message d&apos;accueil
            </label>
            <Textarea
              id="welcomeMessage"
              placeholder="Bonjour ! Comment puis-je vous aider ?"
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
          <p className="text-[15px] font-semibold text-tx-primary">Paramètres avancés</p>
          <p className="mt-0.5 text-[13px] text-tx-muted">
            Ajustez le comportement de génération de l&apos;IA.
          </p>
        </div>

        <div className="space-y-6">
          {/* language */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-tx-secondary" htmlFor="language">
              Langue des réponses
            </label>
            <select
              id="language"
              value={values.language}
              onChange={(e) => onChange('language', e.target.value as 'fr' | 'en')}
              className={inputClass}
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
            <p className="text-[12px] text-tx-disabled">
              Détermine la langue des instructions système de l&apos;IA.
            </p>
          </div>
          {/* maxTokens */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-medium text-tx-secondary" htmlFor="maxTokens">
                Tokens maximum
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
            <p className="text-[12px] text-tx-disabled">Longueur maximale des réponses générées.</p>
          </div>

          {/* temperature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-medium text-tx-secondary" htmlFor="temperature">
                Température
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
            <p className="text-[12px] text-tx-disabled">
              0 = précis et déterministe, 1 = créatif et varié.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================
// AppearanceFields
// ============================================

function AppearanceFields({ values, onChange }: Pick<AIFormFieldsProps, 'values' | 'onChange'>) {
  return (
    <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-5">
      <div className="mb-5">
        <p className="text-[15px] font-semibold text-tx-primary">Personnalisation</p>
        <p className="mt-0.5 text-[13px] text-tx-muted">
          Personnalisez l&apos;apparence de votre assistant.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-tx-secondary" htmlFor="primaryColor">
            Couleur principale
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
            Aperçu
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

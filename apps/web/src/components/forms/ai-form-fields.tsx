'use client';

import * as React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Label,
  Textarea,
  Switch,
} from '@corpusai/ui';

/**
 * AI form field values shared between create and edit.
 */
export interface AIFormValues {
  name: string;
  description: string;
  systemPrompt: string;
  welcomeMessage: string;
  primaryColor: string;
  isPublic: boolean;
  maxTokens: number;
  temperature: number;
}

/**
 * Default values for new AI creation.
 */
export const DEFAULT_AI_FORM_VALUES: AIFormValues = {
  name: '',
  description: '',
  systemPrompt: '',
  welcomeMessage: "Bonjour ! Comment puis-je vous aider aujourd'hui ?",
  primaryColor: '#3b82f6',
  isPublic: true,
  maxTokens: 1024,
  temperature: 0.7,
};

interface AIFormFieldsProps {
  values: AIFormValues;
  onChange: <K extends keyof AIFormValues>(field: K, value: AIFormValues[K]) => void;
  /** Show slug field for creation mode */
  showSlug?: boolean;
  slug?: string;
  onSlugChange?: (value: string) => void;
  /** Read-only slug display for edit mode */
  readOnlySlug?: string;
}

/**
 * Shared form fields for AI creation and editing.
 * Renders General, Behavior, and Appearance tab contents.
 */
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

/**
 * General tab fields: name, slug/URL, description, access.
 */
function GeneralFields({
  values,
  onChange,
  showSlug,
  slug,
  onSlugChange,
  readOnlySlug,
}: Pick<AIFormFieldsProps, 'values' | 'onChange' | 'showSlug' | 'slug' | 'onSlugChange' | 'readOnlySlug'>) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Informations de base</CardTitle>
          <CardDescription>
            {showSlug
              ? "Definissez le nom et la description de votre assistant."
              : "Modifiez le nom et la description de votre assistant."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de l&apos;assistant {showSlug && '*'}</Label>
            <Input
              id="name"
              placeholder="Ex: FAQ Support Client"
              value={values.name}
              onChange={(e) => onChange('name', e.target.value)}
              required={showSlug}
              maxLength={100}
            />
          </div>

          {showSlug && slug !== undefined && onSlugChange && (
            <div className="space-y-2">
              <Label htmlFor="slug">URL personnalisee</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">corpusai.app/chat/</span>
                <Input
                  id="slug"
                  placeholder="faq-support"
                  value={slug}
                  onChange={(e) => onSlugChange(e.target.value)}
                  pattern="^[a-z0-9-]+$"
                  maxLength={50}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Lettres minuscules, chiffres et tirets uniquement.
              </p>
            </div>
          )}

          {readOnlySlug && (
            <div className="space-y-2">
              <Label>URL personnalisee</Label>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">corpusai.app/chat/</span>
                <code className="bg-muted px-2 py-1 rounded">{readOnlySlug}</code>
              </div>
              <p className="text-xs text-muted-foreground">
                Le slug ne peut pas etre modifie apres la creation.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Decrivez ce que fait votre assistant..."
              value={values.description}
              onChange={(e) => onChange('description', e.target.value)}
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              {values.description.length}/500 caracteres
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Acces</CardTitle>
          <CardDescription>
            Definissez qui peut acceder a votre assistant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="public">Acces public</Label>
              <p className="text-sm text-muted-foreground">
                Tout le monde peut utiliser cet assistant.
              </p>
            </div>
            <Switch
              id="public"
              checked={values.isPublic}
              onCheckedChange={(checked) => onChange('isPublic', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
}

/**
 * Behavior tab fields: system prompt, welcome message, advanced settings.
 */
function BehaviorFields({
  values,
  onChange,
}: Pick<AIFormFieldsProps, 'values' | 'onChange'>) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Prompt systeme</CardTitle>
          <CardDescription>
            Instructions de base pour guider le comportement de l&apos;IA.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">Instructions</Label>
            <Textarea
              id="systemPrompt"
              placeholder="Tu es un assistant specialise dans..."
              value={values.systemPrompt}
              onChange={(e) => onChange('systemPrompt', e.target.value)}
              maxLength={4000}
              rows={6}
            />
            <p className="text-xs text-muted-foreground">
              {values.systemPrompt.length}/4000 caracteres
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="welcomeMessage">Message d&apos;accueil</Label>
            <Textarea
              id="welcomeMessage"
              placeholder="Bonjour ! Comment puis-je vous aider ?"
              value={values.welcomeMessage}
              onChange={(e) => onChange('welcomeMessage', e.target.value)}
              maxLength={500}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parametres avances</CardTitle>
          <CardDescription>
            Ajustez le comportement de generation de l&apos;IA.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="maxTokens">Tokens maximum</Label>
              <span className="text-sm text-muted-foreground">{values.maxTokens}</span>
            </div>
            <input
              type="range"
              id="maxTokens"
              min={100}
              max={4096}
              step={100}
              value={values.maxTokens}
              onChange={(e) => onChange('maxTokens', Number(e.target.value))}
              className="w-full accent-primary"
            />
            <p className="text-xs text-muted-foreground">
              Longueur maximale des reponses generees.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="temperature">Temperature</Label>
              <span className="text-sm text-muted-foreground">
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
              className="w-full accent-primary"
            />
            <p className="text-xs text-muted-foreground">
              0 = precis et deterministe, 1 = creatif et varie.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

/**
 * Appearance tab fields: primary color with preview.
 */
function AppearanceFields({
  values,
  onChange,
}: Pick<AIFormFieldsProps, 'values' | 'onChange'>) {
  const previewStyle = React.useMemo(
    () => ({ backgroundColor: values.primaryColor }),
    [values.primaryColor]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personnalisation</CardTitle>
        <CardDescription>
          Personnalisez l&apos;apparence de votre assistant.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="primaryColor">Couleur principale</Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              id="primaryColor"
              value={values.primaryColor}
              onChange={(e) => onChange('primaryColor', e.target.value)}
              className="h-10 w-20 rounded border border-border cursor-pointer"
            />
            <Input
              value={values.primaryColor}
              onChange={(e) => onChange('primaryColor', e.target.value)}
              pattern="^#[0-9A-Fa-f]{6}$"
              className="w-32"
            />
          </div>
        </div>

        <div className="mt-6 p-4 rounded-lg border border-border bg-muted/30">
          <p className="text-sm font-medium mb-3">Apercu</p>
          <div className="flex items-start gap-3">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
              style={previewStyle}
            >
              {values.name ? values.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="flex-1">
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2 text-sm max-w-[80%]">
                {values.welcomeMessage || "Bonjour ! Comment puis-je vous aider ?"}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

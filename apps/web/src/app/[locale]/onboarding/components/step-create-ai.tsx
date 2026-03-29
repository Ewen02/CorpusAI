import * as React from 'react';
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@corpusai/ui';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';
import type { TemplateSelection } from './step-template';

const SLUG_FORBIDDEN = /[^a-z0-9\s-]/g;
const SLUG_SPACES = /\s+/g;
const SLUG_DASHES = /-+/g;
const SLUG_MAX_LENGTH = 50;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(SLUG_FORBIDDEN, '')
    .replace(SLUG_SPACES, '-')
    .replace(SLUG_DASHES, '-')
    .slice(0, SLUG_MAX_LENGTH);
}

export interface CreatedAI {
  id: string;
  slug: string;
  name: string;
  description?: string;
}

interface StepCreateAIProps {
  onCreated: (ai: CreatedAI) => void;
  template?: TemplateSelection | null;
}

export function StepCreateAI({ onCreated, template }: StepCreateAIProps) {
  const t = useTranslations('onboarding.createAI');
  const [name, setName] = React.useState(template?.name ?? '');
  const [slug, setSlug] = React.useState(template?.name ? slugify(template.name) : '');
  const [description, setDescription] = React.useState(template?.description ?? '');
  const [language, setLanguage] = React.useState<'fr' | 'en'>('fr');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleNameChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    setSlug(slugify(value));
  }, []);

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim() || !slug) return;
      setError(null);
      setIsLoading(true);
      try {
        const ai = await apiClient.post<CreatedAI>('/ais', {
          name: name.trim(),
          slug,
          description: description.trim() || undefined,
          language,
          isPublic: true,
          ...(template && {
            systemPrompt: template.systemPrompt || undefined,
            welcomeMessage: template.welcomeMessage || undefined,
            category: template.category || undefined,
          }),
        });
        if (description.trim()) ai.description = description.trim();
        onCreated(ai);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errorGeneric'));
      } finally {
        setIsLoading(false);
      }
    },
    [name, slug, description, language, onCreated, t]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-[hsl(var(--text-primary))]">
          {t('title')}
        </h2>
        <p className="text-sm text-[hsl(var(--text-muted))]">{t('subtitle')}</p>
      </div>

      <Card className="surface-raised">
        <CardContent className="space-y-5 pt-6">
          <div className="space-y-2">
            <Label htmlFor="ai-name">{t('nameLabel')}</Label>
            <Input
              id="ai-name"
              placeholder={t('namePlaceholder')}
              value={name}
              onChange={handleNameChange}
              required
              autoFocus
            />
            {slug && (
              <p className="text-xs text-[hsl(var(--text-muted))]">
                {t('urlPrefix')}{' '}
                <span className="font-mono text-[hsl(var(--text-secondary))]">/chat/{slug}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-description">
              {t('descriptionLabel')}{' '}
              <span className="text-[hsl(var(--text-muted))]">{t('descriptionOptional')}</span>
            </Label>
            <Textarea
              id="ai-description"
              placeholder={t('descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-language">{t('languageLabel')}</Label>
            <Select value={language} onValueChange={(v) => setLanguage(v as 'fr' | 'en')}>
              <SelectTrigger id="ai-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">{t('languageFr')}</SelectItem>
                <SelectItem value="en">{t('languageEn')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-lg border border-[hsl(var(--danger)/0.3)] bg-[hsl(var(--danger-subtle))] px-4 py-3 text-sm text-[hsl(var(--danger))]">
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="bg-gradient-primary w-full"
        disabled={!name.trim() || !slug || isLoading}
      >
        {isLoading ? t('creating') : t('continue')}
      </Button>
    </form>
  );
}

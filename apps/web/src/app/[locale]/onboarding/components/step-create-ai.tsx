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
import { apiClient } from '@/lib/api-client';

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
}

export function StepCreateAI({ onCreated }: StepCreateAIProps) {
  const [name, setName] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [description, setDescription] = React.useState('');
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
        });
        if (description.trim()) ai.description = description.trim();
        onCreated(ai);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setIsLoading(false);
      }
    },
    [name, slug, description, language, onCreated]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-[hsl(var(--text-primary))]">
          Créez votre assistant
        </h2>
        <p className="text-sm text-[hsl(var(--text-muted))]">
          Donnez un nom à votre IA — vous pourrez tout configurer plus tard.
        </p>
      </div>

      <Card className="surface-raised">
        <CardContent className="space-y-5 pt-6">
          <div className="space-y-2">
            <Label htmlFor="ai-name">Nom de l&apos;assistant</Label>
            <Input
              id="ai-name"
              placeholder="ex: Assistant RH, Support client…"
              value={name}
              onChange={handleNameChange}
              required
              autoFocus
            />
            {slug && (
              <p className="text-xs text-[hsl(var(--text-muted))]">
                URL :{' '}
                <span className="font-mono text-[hsl(var(--text-secondary))]">/chat/{slug}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-description">
              Description <span className="text-[hsl(var(--text-muted))]">(optionnel)</span>
            </Label>
            <Textarea
              id="ai-description"
              placeholder="Décrivez ce que fait votre assistant…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-language">Langue</Label>
            <Select value={language} onValueChange={(v) => setLanguage(v as 'fr' | 'en')}>
              <SelectTrigger id="ai-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="en">English</SelectItem>
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
        {isLoading ? 'Création en cours…' : 'Continuer'}
      </Button>
    </form>
  );
}

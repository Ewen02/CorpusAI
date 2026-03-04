'use client';

import * as React from 'react';
import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@corpusai/ui';
import { apiClient } from '@/lib/api-client';
import { useNavigation } from '@/lib/hooks';
import { AIFormFields, DEFAULT_AI_FORM_VALUES, ErrorAlert, type AIFormValues } from '@/components';
import { PageWrapper } from '@/components/page-wrapper';

export default function CreateAIPage() {
  const { goToAI, router } = useNavigation();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Form state
  const [formValues, setFormValues] = React.useState<AIFormValues>(DEFAULT_AI_FORM_VALUES);
  const [slug, setSlug] = React.useState('');

  // Handle field changes
  const handleFieldChange = React.useCallback(
    <K extends keyof AIFormValues>(field: K, value: AIFormValues[K]) => {
      setFormValues((prev) => ({ ...prev, [field]: value }));

      // Auto-generate slug from name
      if (field === 'name' && typeof value === 'string') {
        const generatedSlug = value
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .slice(0, 50);
        setSlug(generatedSlug);
      }
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const ai = await apiClient.post<{ id: string }>('/ais', {
        name: formValues.name,
        slug,
        description: formValues.description,
        systemPrompt: formValues.systemPrompt,
        welcomeMessage: formValues.welcomeMessage,
        primaryColor: formValues.primaryColor,
        accessType: formValues.isPublic ? 'FREE' : 'PRIVATE',
        maxTokens: formValues.maxTokens,
        temperature: formValues.temperature,
      });
      goToAI(ai.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const formFields = AIFormFields({
    values: formValues,
    onChange: handleFieldChange,
    showSlug: true,
    slug,
    onSlugChange: setSlug,
  });

  return (
    <PageWrapper className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Creer un assistant IA</h1>
        <p className="mt-2 text-muted-foreground">
          Configurez votre assistant et commencez a lui ajouter des documents.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="behavior">Comportement</TabsTrigger>
            <TabsTrigger value="appearance">Apparence</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            {formFields.general}
          </TabsContent>

          <TabsContent value="behavior" className="space-y-6">
            {formFields.behavior}
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6">
            {formFields.appearance}
          </TabsContent>
        </Tabs>

        <ErrorAlert message={error} className="mt-6" />

        <div className="mt-8 flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button variant="default" type="submit" disabled={isLoading || !formValues.name || !slug}>
            {isLoading ? 'Creation en cours...' : "Creer l'assistant"}
          </Button>
        </div>
      </form>
    </PageWrapper>
  );
}

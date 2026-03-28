'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@corpusai/ui';
import { apiClient } from '@/lib/api-client';
import { useNavigation } from '@/lib/hooks';
import { AIFormFields, DEFAULT_AI_FORM_VALUES, ErrorAlert, type AIFormValues } from '@/components';
import { PageWrapper } from '@/components/page-wrapper';

export default function CreateAIPage() {
  const t = useTranslations('ai.create');
  const tc = useTranslations('common');
  const { goToAI, router } = useNavigation();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [formValues, setFormValues] = React.useState<AIFormValues>(DEFAULT_AI_FORM_VALUES);
  const [slug, setSlug] = React.useState('');

  const handleFieldChange = React.useCallback(
    <K extends keyof AIFormValues>(field: K, value: AIFormValues[K]) => {
      setFormValues((prev) => ({ ...prev, [field]: value }));

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
        category: formValues.category,
        maxTokens: formValues.maxTokens,
        temperature: formValues.temperature,
        language: formValues.language,
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

  const tabTriggerClass =
    'rounded-md px-4 py-1.5 text-[13px] font-medium transition-all duration-150 data-[state=active]:bg-[hsl(var(--surface-1))] data-[state=active]:text-tx-primary data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-[hsl(var(--border-default))] data-[state=inactive]:text-tx-muted';

  return (
    <PageWrapper className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-tx-primary">{t('title')}</h1>
        <p className="mt-1 text-sm text-tx-muted">{t('subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="inline-flex items-center gap-0.5 rounded-lg bg-[hsl(var(--surface-2))] p-1">
            <TabsTrigger value="general" className={tabTriggerClass}>
              {t('tabGeneral')}
            </TabsTrigger>
            <TabsTrigger value="behavior" className={tabTriggerClass}>
              {t('tabBehavior')}
            </TabsTrigger>
            <TabsTrigger value="appearance" className={tabTriggerClass}>
              {t('tabAppearance')}
            </TabsTrigger>
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

        <div className="mt-8 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            {tc('cancel')}
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isLoading || !formValues.name || !slug}
            className="bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-[0_2px_8px_hsl(var(--accent-500)/0.35)] hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? t('submitting') : t('submit')}
          </Button>
        </div>
      </form>
    </PageWrapper>
  );
}

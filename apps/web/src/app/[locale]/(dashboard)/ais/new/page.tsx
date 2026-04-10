'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@corpusai/ui';
import { Headphones, GraduationCap, Scale, TrendingUp, Heart, Code, Sparkles } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { track } from '@/lib/analytics';
import { useNavigation } from '@/lib/hooks';
import { AIFormFields, DEFAULT_AI_FORM_VALUES, ErrorAlert, type AIFormValues } from '@/components';
import { PageWrapper } from '@/components/page-wrapper';
import { AI_TEMPLATES } from '@/app/[locale]/onboarding/templates';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Headphones,
  GraduationCap,
  Scale,
  TrendingUp,
  Heart,
  Code,
  Sparkles,
};

export default function CreateAIPage() {
  const t = useTranslations('ai.create');
  const tc = useTranslations('common');
  const tt = useTranslations('onboarding.templates');
  const { goToAI, router } = useNavigation();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | null>(null);

  const [formValues, setFormValues] = React.useState<AIFormValues>(DEFAULT_AI_FORM_VALUES);
  const [slug, setSlug] = React.useState('');

  // Analytics: track AI creation funnel entry (once per mount)
  React.useEffect(() => {
    track('ai_creation_started');
  }, []);

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

  const handleTemplateClick = React.useCallback(
    (templateId: string) => {
      const template = AI_TEMPLATES.find((t) => t.id === templateId);
      if (!template || template.id === 'custom') {
        setSelectedTemplateId(null);
        setFormValues(DEFAULT_AI_FORM_VALUES);
        setSlug('');
        return;
      }

      setSelectedTemplateId(templateId);
      track('ai_template_selected', { template: templateId });
      const name = tt(`${templateId}.name`);
      const description = tt(`${templateId}.description`);
      const systemPrompt = tt(`${templateId}.systemPrompt`);
      const welcomeMessage = tt(`${templateId}.welcomeMessage`);

      setFormValues((prev) => ({
        ...prev,
        name,
        description,
        systemPrompt,
        welcomeMessage,
        category: template.category,
      }));
      setSlug(
        name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .slice(0, 50)
      );
    },
    [tt]
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

      {/* Template selector */}
      <div className="mb-8">
        <p className="mb-3 text-[13px] font-medium text-tx-secondary">{tt('title')}</p>
        <div className="flex flex-wrap gap-2">
          {AI_TEMPLATES.map((template) => {
            const Icon = ICON_MAP[template.icon] ?? Sparkles;
            const isSelected = selectedTemplateId === template.id;
            const isCustom = template.id === 'custom';

            return (
              <button
                key={template.id}
                type="button"
                onClick={() => handleTemplateClick(template.id)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] transition-all ${
                  isSelected
                    ? 'border-[hsl(var(--accent-500)/0.5)] bg-[hsl(var(--accent-500)/0.08)] text-[hsl(var(--accent-500))]'
                    : isCustom && !selectedTemplateId
                      ? 'border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] text-tx-secondary'
                      : 'border-[hsl(var(--border-subtle))] text-tx-muted hover:border-[hsl(var(--border-default))] hover:text-tx-secondary'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tt(`${template.id}.name`)}
              </button>
            );
          })}
        </div>
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
            className="bg-gradient-primary shadow-[0_2px_8px_hsl(var(--accent-500)/0.35)] hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? t('submitting') : t('submit')}
          </Button>
        </div>
      </form>
    </PageWrapper>
  );
}

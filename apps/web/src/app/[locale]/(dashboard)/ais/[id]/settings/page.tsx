'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger, cn } from '@corpusai/ui';
import { DocumentStatus } from '@corpusai/types';

import { useRouter } from '@/i18n/routing';
import { PageWrapper } from '@/components/page-wrapper';
import { useAI, useDeleteAI, useDocuments } from '@/lib/queries';

import { TAB_TRIGGER_CLASS } from './constants';
import { useAISettingsForm, useAISuggestions } from './hooks';
import { AccessTab, AppearanceTab, BehaviorTab, DangerTab, GeneralTab } from './components';

export default function AISettingsPage() {
  const t = useTranslations('aiSettings');
  const params = useParams();
  const router = useRouter();
  const aiId = params.id as string;

  const { data: ai, isLoading } = useAI(aiId);
  const { data: documents } = useDocuments(aiId);
  const deleteAI = useDeleteAI();

  const form = useAISettingsForm(aiId, ai);

  const suggestions = useAISuggestions(aiId, {
    setDescription: form.setDescription,
    setSystemPrompt: form.setSystemPrompt,
    setWelcomeMessage: form.setWelcomeMessage,
  });

  // AI-suggestions gate: the backend refuses the call with 400 when the AI
  // has no INDEXED document. The denormalised `ai.documentCount` is misleading
  // because it counts PENDING/PROCESSING/FAILED too — use the real list.
  const indexedDocumentCount = React.useMemo(
    () => documents?.filter((d) => d.status === DocumentStatus.INDEXED).length ?? 0,
    [documents]
  );
  const canGenerateSuggestions = indexedDocumentCount > 0;

  const [activeTab, setActiveTab] = React.useState('general');
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState('');
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const handleDelete = async () => {
    if (deleteConfirmText !== ai?.name) return;
    try {
      await deleteAI.mutateAsync(aiId);
      router.push('/ais');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('dangerZone.deleteError'));
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-96" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  if (!ai) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-12 text-center">
          <p className="text-[13px] text-tx-muted">{t('notFound')}</p>
          <Button className="mt-4" size="sm" onClick={() => router.push('/ais')}>
            {t('backToList')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PageWrapper className="container max-w-4xl py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-1.5 text-[13px] text-tx-muted">
          <button
            onClick={() => router.push(`/ais/${aiId}`)}
            className="transition-colors hover:text-tx-primary"
          >
            {ai.name}
          </button>
          <span className="text-tx-disabled">/</span>
          <span>{t('breadcrumbSettings')}</span>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-tx-primary">
            {t('pageTitle')}
          </h1>
          <div className="min-h-[18px] text-[12px]">
            {form.saveStatus === 'saving' && (
              <span className="text-tx-disabled">{t('saving')}</span>
            )}
            {form.saveStatus === 'saved' && (
              <span className="text-[hsl(var(--success))]">✓ {t('saved')}</span>
            )}
            {form.saveStatus === 'error' && (
              <span className="text-[hsl(var(--danger))]">{form.saveError}</span>
            )}
          </div>
        </div>
        <p className="mt-1 text-sm text-tx-muted">{t('pageDescription')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="inline-flex items-center gap-0.5 rounded-lg bg-[hsl(var(--surface-2))] p-1">
          <TabsTrigger value="general" className={TAB_TRIGGER_CLASS}>
            {t('tabs.general')}
          </TabsTrigger>
          <TabsTrigger value="behavior" className={TAB_TRIGGER_CLASS}>
            {t('tabs.behavior')}
          </TabsTrigger>
          <TabsTrigger value="appearance" className={TAB_TRIGGER_CLASS}>
            {t('tabs.appearance')}
          </TabsTrigger>
          <TabsTrigger value="danger" className={TAB_TRIGGER_CLASS}>
            {t('tabs.danger')}
          </TabsTrigger>
          <TabsTrigger value="access" className={TAB_TRIGGER_CLASS}>
            {t('tabs.access')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <GeneralTab
            aiSlug={ai.slug}
            name={form.name}
            description={form.description}
            category={form.category}
            status={form.status}
            isPublic={form.isPublic}
            setName={form.setName}
            setDescription={form.setDescription}
            setCategory={form.setCategory}
            setStatus={form.setStatus}
            setIsPublic={form.setIsPublic}
            save={form.save}
            suggestions={suggestions.suggestions}
            isSuggesting={suggestions.isPending}
            canGenerateSuggestions={canGenerateSuggestions}
            onGenerateSuggestions={suggestions.handleGenerate}
            acceptSuggestion={suggestions.acceptSuggestion}
            dismissSuggestion={suggestions.dismissSuggestion}
          />
        </TabsContent>

        <TabsContent value="behavior" className="space-y-6">
          <BehaviorTab
            systemPrompt={form.systemPrompt}
            welcomeMessage={form.welcomeMessage}
            language={form.language}
            llmModel={form.llmModel}
            maxTokens={form.maxTokens}
            temperature={form.temperature}
            scoreThreshold={form.scoreThreshold}
            setSystemPrompt={form.setSystemPrompt}
            setWelcomeMessage={form.setWelcomeMessage}
            setLanguage={form.setLanguage}
            setLlmModel={form.setLlmModel}
            setMaxTokens={form.setMaxTokens}
            setTemperature={form.setTemperature}
            setScoreThreshold={form.setScoreThreshold}
            save={form.save}
            suggestions={suggestions.suggestions}
            isSuggesting={suggestions.isPending}
            canGenerateSuggestions={canGenerateSuggestions}
            onGenerateSuggestions={suggestions.handleGenerate}
            acceptSuggestion={suggestions.acceptSuggestion}
            dismissSuggestion={suggestions.dismissSuggestion}
          />
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <AppearanceTab
            name={form.name}
            primaryColor={form.primaryColor}
            welcomeMessage={form.welcomeMessage}
            setPrimaryColor={form.setPrimaryColor}
            save={form.save}
          />
        </TabsContent>

        <TabsContent value="danger" className="space-y-6">
          <DangerTab
            aiId={aiId}
            aiName={ai.name}
            showDeleteConfirm={showDeleteConfirm}
            setShowDeleteConfirm={setShowDeleteConfirm}
            deleteConfirmText={deleteConfirmText}
            setDeleteConfirmText={setDeleteConfirmText}
            isDeletePending={deleteAI.isPending}
            onDelete={handleDelete}
          />
        </TabsContent>

        {/* Access Tab — forceMount to prevent unmount/remount which could trigger spurious mutations */}
        <TabsContent
          value="access"
          forceMount
          className={cn('space-y-6', activeTab !== 'access' && 'hidden')}
        >
          <AccessTab
            aiId={aiId}
            inviteOnly={ai.inviteOnly}
            hasAccessToken={ai.hasAccessToken}
            hasAccessCode={ai.hasAccessCode}
          />
        </TabsContent>
      </Tabs>

      {(suggestions.generateError || deleteError) && (
        <div className="mt-6 animate-fade-in-up rounded-lg bg-[hsl(var(--danger)/0.1)] p-3 text-[13px] text-[hsl(var(--danger))]">
          {suggestions.generateError ?? deleteError}
        </div>
      )}

      <div className="mt-8">
        <Button variant="outline" size="sm" onClick={() => router.push(`/ais/${aiId}`)}>
          {t('back')}
        </Button>
      </div>
    </PageWrapper>
  );
}

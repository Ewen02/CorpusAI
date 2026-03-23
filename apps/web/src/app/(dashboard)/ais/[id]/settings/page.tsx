'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Button,
  Input,
  Textarea,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Skeleton,
  Badge,
  cn,
} from '@corpusai/ui';
import { useAI, useUpdateAI, useDeleteAI } from '@/lib/queries';
import { PageWrapper } from '@/components/page-wrapper';
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

type AIStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

const statusOptions: { value: AIStatus; label: string; description: string; color: string }[] = [
  {
    value: 'DRAFT',
    label: 'Brouillon',
    description: 'Non visible publiquement',
    color: 'bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]',
  },
  {
    value: 'ACTIVE',
    label: 'Actif',
    description: 'Accessible à tous',
    color: 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]',
  },
  {
    value: 'PAUSED',
    label: 'En pause',
    description: 'Temporairement désactivé',
    color: 'bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning)/0.8)]',
  },
  {
    value: 'ARCHIVED',
    label: 'Archivé',
    description: 'Conservé mais inactif',
    color: 'bg-[hsl(var(--surface-3))] text-tx-muted',
  },
];

const inputClass =
  'h-9 border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] text-[13px] text-tx-primary placeholder:text-tx-disabled focus:border-[hsl(var(--accent-500)/0.4)] focus:ring-1 focus:ring-[hsl(var(--accent-500)/0.15)]';

const tabTriggerClass =
  'rounded-md px-4 py-1.5 text-[13px] font-medium transition-all duration-150 data-[state=active]:bg-[hsl(var(--surface-1))] data-[state=active]:text-tx-primary data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-[hsl(var(--border-default))] data-[state=inactive]:text-tx-muted';

export default function AISettingsPage() {
  const params = useParams();
  const router = useRouter();
  const aiId = params.id as string;

  const { data: ai, isLoading } = useAI(aiId);
  const updateAI = useUpdateAI();
  const deleteAI = useDeleteAI();

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [systemPrompt, setSystemPrompt] = React.useState('');
  const [welcomeMessage, setWelcomeMessage] = React.useState('');
  const [primaryColor, setPrimaryColor] = React.useState('#3b82f6');
  const [isPublic, setIsPublic] = React.useState(true);
  const [category, setCategory] = React.useState<AICategory>('OTHER');
  const [maxTokens, setMaxTokens] = React.useState(1024);
  const [temperature, setTemperature] = React.useState(0.7);
  const [scoreThreshold, setScoreThreshold] = React.useState(0.6);
  const [language, setLanguage] = React.useState<'fr' | 'en'>('fr');
  const [status, setStatus] = React.useState<AIStatus>('DRAFT');

  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState('');

  React.useEffect(() => {
    if (ai) {
      setName(ai.name || '');
      setDescription(ai.description || '');
      setSystemPrompt(ai.systemPrompt || '');
      setWelcomeMessage(ai.welcomeMessage || '');
      setPrimaryColor(ai.primaryColor || '#3b82f6');
      setIsPublic(ai.isPublic ?? true);
      setCategory((ai.category as AICategory) || 'OTHER');
      setMaxTokens(ai.maxTokens || 1024);
      setTemperature(ai.temperature || 0.7);
      setScoreThreshold(ai.scoreThreshold || 0.6);
      setLanguage((ai.language as 'fr' | 'en') || 'fr');
      setStatus((ai.status as AIStatus) || 'DRAFT');
    }
  }, [ai]);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    try {
      await updateAI.mutateAsync({
        id: aiId,
        data: {
          name,
          description,
          systemPrompt,
          welcomeMessage,
          primaryColor,
          isPublic,
          category,
          maxTokens,
          temperature,
          scoreThreshold,
          language,
          status,
        },
      });
      setSuccess('Paramètres sauvegardés avec succès');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== ai?.name) return;

    try {
      await deleteAI.mutateAsync(aiId);
      router.push('/ais');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
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
          <p className="text-[13px] text-tx-muted">Assistant introuvable</p>
          <Button className="mt-4" size="sm" onClick={() => router.push('/ais')}>
            Retour à la liste
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
          <span>Paramètres</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-tx-primary">Paramètres</h1>
        <p className="mt-1 text-sm text-tx-muted">
          Configurez les paramètres de votre assistant IA.
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="inline-flex items-center gap-0.5 rounded-lg bg-[hsl(var(--surface-2))] p-1">
          <TabsTrigger value="general" className={tabTriggerClass}>
            Général
          </TabsTrigger>
          <TabsTrigger value="behavior" className={tabTriggerClass}>
            Comportement
          </TabsTrigger>
          <TabsTrigger value="appearance" className={tabTriggerClass}>
            Apparence
          </TabsTrigger>
          <TabsTrigger value="danger" className={tabTriggerClass}>
            Zone danger
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          {/* Informations de base */}
          <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-5">
            <div className="mb-5">
              <p className="text-[15px] font-semibold text-tx-primary">Informations de base</p>
              <p className="mt-0.5 text-[13px] text-tx-muted">
                Modifiez le nom et la description de votre assistant.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-[13px] font-medium text-tx-secondary">
                  Nom de l&apos;assistant
                </label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-[13px] font-medium text-tx-secondary">URL personnalisée</p>
                <div className="flex items-center gap-2 text-[13px]">
                  <span className="text-tx-muted">corpusai.app/chat/</span>
                  <code className="rounded-md border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] px-2 py-0.5 font-mono text-[13px] text-tx-primary">
                    {ai.slug}
                  </code>
                </div>
                <p className="text-[12px] text-tx-disabled">
                  Le slug ne peut pas être modifié après la création.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="description" className="text-[13px] font-medium text-tx-secondary">
                  Description
                </label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] text-[13px] text-tx-primary placeholder:text-tx-disabled focus:border-[hsl(var(--accent-500)/0.4)] focus:ring-1 focus:ring-[hsl(var(--accent-500)/0.15)]"
                />
                <p className="text-[12px] text-tx-disabled">{description.length}/500 caractères</p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="category" className="text-[13px] font-medium text-tx-secondary">
                  Catégorie
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AICategory)}
                  className="h-9 w-full rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] px-3 text-[13px] text-tx-primary focus:border-[hsl(var(--accent-500)/0.4)] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--accent-500)/0.15)]"
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

          {/* Statut */}
          <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-5">
            <div className="mb-5">
              <p className="text-[15px] font-semibold text-tx-primary">Statut</p>
              <p className="mt-0.5 text-[13px] text-tx-muted">
                Contrôlez la visibilité et l&apos;accessibilité de votre assistant.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatus(option.value)}
                  className={cn(
                    'rounded-lg border p-4 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-500)/0.5)]',
                    status === option.value
                      ? 'border-[hsl(var(--accent-500)/0.3)] bg-[hsl(var(--accent-500)/0.06)]'
                      : 'border-[hsl(var(--border-default))] hover:border-[hsl(var(--accent-500)/0.2)] hover:bg-[hsl(var(--surface-2))]'
                  )}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <Badge className={option.color}>{option.label}</Badge>
                  </div>
                  <p className="text-[12px] text-tx-muted">{option.description}</p>
                </button>
              ))}
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
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
          </div>
        </TabsContent>

        {/* Behavior Tab */}
        <TabsContent value="behavior" className="space-y-6">
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
                <label htmlFor="systemPrompt" className="text-[13px] font-medium text-tx-secondary">
                  Instructions
                </label>
                <Textarea
                  id="systemPrompt"
                  placeholder="Tu es un assistant spécialisé dans..."
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  maxLength={4000}
                  rows={6}
                  className="border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] text-[13px] text-tx-primary placeholder:text-tx-disabled focus:border-[hsl(var(--accent-500)/0.4)] focus:ring-1 focus:ring-[hsl(var(--accent-500)/0.15)]"
                />
                <p className="text-[12px] text-tx-disabled">
                  {systemPrompt.length}/4000 caractères
                </p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="welcomeMessage"
                  className="text-[13px] font-medium text-tx-secondary"
                >
                  Message d&apos;accueil
                </label>
                <Textarea
                  id="welcomeMessage"
                  placeholder="Bonjour ! Comment puis-je vous aider ?"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
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
              <div className="space-y-1.5">
                <label htmlFor="language" className="text-[13px] font-medium text-tx-secondary">
                  Langue des réponses
                </label>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'fr' | 'en')}
                  className="h-9 w-full rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] px-3 text-[13px] text-tx-primary focus:border-[hsl(var(--accent-500)/0.4)] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--accent-500)/0.15)]"
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
                <p className="text-[12px] text-tx-disabled">
                  Détermine la langue des instructions système de l&apos;IA.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="maxTokens" className="text-[13px] font-medium text-tx-secondary">
                    Tokens maximum
                  </label>
                  <span className="rounded-md border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] px-1.5 py-0.5 text-[12px] tabular-nums text-tx-muted">
                    {maxTokens}
                  </span>
                </div>
                <input
                  type="range"
                  id="maxTokens"
                  min={100}
                  max={4096}
                  step={100}
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <p className="text-[12px] text-tx-disabled">
                  Longueur maximale des réponses générées.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="temperature"
                    className="text-[13px] font-medium text-tx-secondary"
                  >
                    Température
                  </label>
                  <span className="rounded-md border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] px-1.5 py-0.5 text-[12px] tabular-nums text-tx-muted">
                    {temperature.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  id="temperature"
                  min={0}
                  max={1}
                  step={0.1}
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <p className="text-[12px] text-tx-disabled">
                  0 = précis et déterministe, 1 = créatif et varié.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="scoreThreshold"
                    className="text-[13px] font-medium text-tx-secondary"
                  >
                    Seuil de pertinence RAG
                  </label>
                  <span className="rounded-md border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] px-1.5 py-0.5 text-[12px] tabular-nums text-tx-muted">
                    {scoreThreshold.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  id="scoreThreshold"
                  min={0.3}
                  max={0.9}
                  step={0.1}
                  value={scoreThreshold}
                  onChange={(e) => setScoreThreshold(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <p className="text-[12px] text-tx-disabled">
                  Score minimum pour inclure un document dans le contexte. 0.3 = permissif, 0.9 =
                  très strict.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-5">
            <div className="mb-5">
              <p className="text-[15px] font-semibold text-tx-primary">Personnalisation</p>
              <p className="mt-0.5 text-[13px] text-tx-muted">
                Personnalisez l&apos;apparence de votre assistant.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="primaryColor" className="text-[13px] font-medium text-tx-secondary">
                  Couleur principale
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="primaryColor"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-9 w-16 cursor-pointer rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-0.5"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    pattern="^#[0-9A-Fa-f]{6}$"
                    className={cn(inputClass, 'w-32 font-mono')}
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="mt-6 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] p-4">
                <p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-tx-disabled">
                  Aperçu
                </p>
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400/20 to-indigo-600/10 text-[13px] font-semibold text-[hsl(var(--accent-500))] ring-1 ring-[hsl(var(--accent-500)/0.2)]">
                    {name ? name.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <div className="flex-1">
                    <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-[hsl(var(--surface-1))] px-3.5 py-2 text-[13px] leading-relaxed text-tx-primary">
                      {welcomeMessage || 'Bonjour ! Comment puis-je vous aider ?'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Danger Zone Tab */}
        <TabsContent value="danger" className="space-y-6">
          <div className="rounded-xl border border-[hsl(var(--danger)/0.2)] bg-[hsl(var(--danger)/0.04)] p-5">
            <div className="mb-5">
              <p className="text-[15px] font-semibold text-[hsl(var(--danger))]">Zone de danger</p>
              <p className="mt-0.5 text-[13px] text-tx-muted">
                Actions irréversibles. Procédez avec précaution.
              </p>
            </div>

            <div className="rounded-lg border border-[hsl(var(--danger)/0.3)] bg-[hsl(var(--danger)/0.06)] p-4">
              <h4 className="mb-2 text-[13px] font-semibold text-[hsl(var(--danger))]">
                Supprimer cet assistant
              </h4>
              <p className="mb-4 text-[13px] text-tx-muted">
                Cette action supprimera définitivement l&apos;assistant, tous ses documents,
                conversations et données associées. Cette action est irréversible.
              </p>

              {!showDeleteConfirm ? (
                <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                  Supprimer l&apos;assistant
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-[13px] text-tx-secondary">
                    Pour confirmer, tapez <strong className="text-tx-primary">{ai.name}</strong>{' '}
                    ci-dessous :
                  </p>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={ai.name}
                    className={inputClass}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={deleteConfirmText !== ai.name || deleteAI.isPending}
                    >
                      {deleteAI.isPending ? 'Suppression...' : 'Confirmer la suppression'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText('');
                      }}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Messages */}
      {error && (
        <div className="mt-6 animate-fade-in-up rounded-lg bg-[hsl(var(--danger)/0.1)] p-3 text-[13px] text-[hsl(var(--danger))]">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-6 animate-fade-in-up rounded-lg bg-[hsl(var(--success)/0.1)] p-3 text-[13px] text-[hsl(var(--success))]">
          {success}
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => router.push(`/ais/${aiId}`)}>
          Retour
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={updateAI.isPending}
          className="bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-[0_2px_8px_hsl(var(--accent-500)/0.35)] hover:opacity-90"
        >
          {updateAI.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </div>
    </PageWrapper>
  );
}

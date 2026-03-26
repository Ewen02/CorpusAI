'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  CopyButton,
  DocumentUploader,
  ChatInterface,
} from '@corpusai/ui';
import { cn } from '@corpusai/ui';
import { apiClient } from '@/lib/api-client';
import { authClient } from '@/lib/auth-client';
import { useDocumentUpload } from '@/app/(dashboard)/ais/[id]/hooks/use-document-upload';
import { useChatState } from '@/app/(dashboard)/ais/[id]/hooks/use-chat-state';

// ─── Constants ────────────────────────────────────────────────

const SLUG_FORBIDDEN = /[^a-z0-9\s-]/g;
const SLUG_SPACES = /\s+/g;
const SLUG_DASHES = /-+/g;
const SLUG_MAX_LENGTH = 50;
const STEP_COUNT = 5;

// ─── Types ────────────────────────────────────────────────────

type WizardStep = 0 | 1 | 2 | 3 | 4 | 5;

interface CreatedAI {
  id: string;
  slug: string;
  name: string;
  description?: string;
}

// ─── Helpers ─────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(SLUG_FORBIDDEN, '')
    .replace(SLUG_SPACES, '-')
    .replace(SLUG_DASHES, '-')
    .slice(0, SLUG_MAX_LENGTH);
}

// ─── Sub-components ───────────────────────────────────────────

interface StepperProps {
  currentStep: WizardStep;
}

function Stepper({ currentStep }: StepperProps) {
  if (currentStep === 0) return null;
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: STEP_COUNT }, (_, i) => i + 1).map((s) => (
        <div
          key={s}
          className={cn(
            'h-1.5 w-10 rounded-full transition-colors duration-300',
            s <= currentStep ? 'bg-primary' : 'bg-[hsl(var(--surface-3))]'
          )}
        />
      ))}
    </div>
  );
}

// ─── Step 0: Welcome ─────────────────────────────────────────

interface StepWelcomeProps {
  firstName: string;
  onNext: () => void;
}

function StepWelcome({ firstName, onNext }: StepWelcomeProps) {
  return (
    <div className="space-y-8 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-10 w-10 text-primary"
        >
          <path d="M12 8V4H8" />
          <rect width="16" height="12" x="4" y="8" rx="2" />
          <path d="M2 14h2" />
          <path d="M20 14h2" />
          <path d="M15 13v2" />
          <path d="M9 13v2" />
        </svg>
      </div>

      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--text-primary))]">
          Bienvenue, <span className="text-gradient-accent">{firstName}</span> !
        </h1>
        <p className="text-[hsl(var(--text-muted))]">
          Transformez vos documents en assistants IA intelligents en quelques minutes.
        </p>
      </div>

      <div className="grid gap-3 text-left">
        {WELCOME_FEATURES.map((feature) => (
          <div key={feature.title} className="surface-raised flex items-start gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              {feature.icon}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[hsl(var(--text-primary))]">
                {feature.title}
              </h3>
              <p className="text-sm text-[hsl(var(--text-muted))]">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <Button size="lg" className="bg-gradient-primary w-full" onClick={onNext}>
          Commencer
        </Button>
        <Button
          variant="ghost"
          className="w-full text-[hsl(var(--text-muted))]"
          onClick={() => window.location.replace('/dashboard')}
        >
          Explorer le dashboard
        </Button>
      </div>
    </div>
  );
}

const WELCOME_FEATURES = [
  {
    title: 'Importez vos documents',
    description: 'PDF, Word, texte… Tous vos fichiers deviennent une base de connaissances.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5 text-primary"
      >
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
  {
    title: 'Posez des questions',
    description: 'Votre IA répond instantanément en se basant sur vos documents.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5 text-primary"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    title: 'Partagez avec le monde',
    description: 'Intégrez votre assistant sur votre site ou partagez-le publiquement.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5 text-primary"
      >
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" x2="12" y1="2" y2="15" />
      </svg>
    ),
  },
];

// ─── Step 1: Create AI ────────────────────────────────────────

interface StepCreateAIProps {
  onCreated: (ai: CreatedAI) => void;
}

function StepCreateAI({ onCreated }: StepCreateAIProps) {
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
        // Attach description locally since API may not return it
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
            <Label htmlFor="ai-name">Nom de l'assistant</Label>
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

// ─── Step 2: Personalize ──────────────────────────────────────

interface StepPersonalizeProps {
  ai: CreatedAI;
  onNext: () => void;
  onSkip: () => void;
}

function StepPersonalize({ ai, onNext, onSkip }: StepPersonalizeProps) {
  const defaultSystemPrompt = `Tu es ${ai.name}${ai.description ? `, spécialisé dans ${ai.description}` : ''}. Tu réponds uniquement à partir des documents fournis.`;
  const defaultWelcomeMessage = `Bonjour ! Je suis ${ai.name}. Comment puis-je vous aider ?`;

  const [systemPrompt, setSystemPrompt] = React.useState(defaultSystemPrompt);
  const [welcomeMessage, setWelcomeMessage] = React.useState(defaultWelcomeMessage);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleContinue = React.useCallback(async () => {
    setIsLoading(true);
    try {
      await apiClient.patch(`/ais/${ai.id}`, {
        systemPrompt: systemPrompt.trim() || undefined,
        welcomeMessage: welcomeMessage.trim() || undefined,
      });
    } catch {
      // Non-critical — proceed regardless
    } finally {
      setIsLoading(false);
      onNext();
    }
  }, [ai.id, systemPrompt, welcomeMessage, onNext]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-[hsl(var(--text-primary))]">
          Personnalisez votre assistant
        </h2>
        <p className="text-sm text-[hsl(var(--text-muted))]">
          Définissez comment il se comporte et comment il se présente.
        </p>
      </div>

      <Card className="surface-raised">
        <CardContent className="space-y-5 pt-6">
          <div className="space-y-2">
            <Label htmlFor="system-prompt">Comportement</Label>
            <Textarea
              id="system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={4}
              maxLength={4000}
              placeholder="Tu es un assistant spécialisé dans [nom]. Tu réponds uniquement à partir des documents fournis. Tu es direct et précis."
            />
            <p className="text-right text-xs text-[hsl(var(--text-muted))]">
              {systemPrompt.length}/4000
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="welcome-message">Message d'accueil</Label>
            <Input
              id="welcome-message"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              maxLength={500}
              placeholder="Bonjour ! Comment puis-je vous aider ?"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          className="bg-gradient-primary w-full"
          onClick={handleContinue}
          disabled={isLoading}
        >
          {isLoading ? 'Enregistrement…' : 'Continuer'}
        </Button>
        <Button variant="ghost" className="w-full text-[hsl(var(--text-muted))]" onClick={onSkip}>
          Passer cette étape
        </Button>
      </div>
    </div>
  );
}

// ─── IndexingBanner ───────────────────────────────────────────

interface IndexingBannerProps {
  indexed: number;
  total: number;
  progress: number;
}

function IndexingBanner({ indexed, total, progress }: IndexingBannerProps) {
  if (total === 0 || indexed === total) return null;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
      <span className="shrink-0 text-sm text-blue-400">
        Indexation en cours — {indexed}/{total} doc{total > 1 ? 's' : ''} · {Math.round(progress)}%
      </span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-blue-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ─── Step 3: Upload Documents ─────────────────────────────────

interface StepUploadProps {
  uploadedFiles: ReturnType<typeof useDocumentUpload>['uploadedFiles'];
  uploadFiles: ReturnType<typeof useDocumentUpload>['uploadFiles'];
  removeFile: ReturnType<typeof useDocumentUpload>['removeFile'];
  onNext: () => void;
  onSkip: () => void;
}

function StepUpload({ uploadedFiles, uploadFiles, removeFile, onNext, onSkip }: StepUploadProps) {
  const hasUploaded = uploadedFiles.some(
    (f) => f.status === 'processing' || f.status === 'success'
  );
  const isUploading = uploadedFiles.some((f) => f.status === 'uploading');

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-[hsl(var(--text-primary))]">
          Ajoutez vos documents
        </h2>
        <p className="text-sm text-[hsl(var(--text-muted))]">
          PDF, Word, texte… Vos documents alimentent la base de connaissance de votre IA.
        </p>
      </div>

      <DocumentUploader
        onFilesSelected={uploadFiles}
        onFileRemove={removeFile}
        uploadedFiles={uploadedFiles}
      />

      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          className="bg-gradient-primary w-full"
          onClick={onNext}
          disabled={!hasUploaded || isUploading}
        >
          {isUploading ? 'Upload en cours…' : 'Continuer'}
        </Button>
        <Button variant="ghost" className="w-full text-[hsl(var(--text-muted))]" onClick={onSkip}>
          Passer cette étape
        </Button>
      </div>
    </div>
  );
}

// ─── Step 4: Test Chat ────────────────────────────────────────

interface StepTestChatProps {
  ai: CreatedAI;
  hasDocuments: boolean;
  isIndexing: boolean;
  indexedCount: number;
  totalCount: number;
  indexingProgress: number;
  onNext: () => void;
  onBack: () => void;
}

function StepTestChat({
  ai,
  hasDocuments,
  isIndexing,
  indexedCount,
  totalCount,
  indexingProgress,
  onNext,
  onBack,
}: StepTestChatProps) {
  const { messages, isStreaming, sendMessage } = useChatState({ aiSlug: ai.slug });

  const header = (
    <div className="space-y-1">
      <h2 className="text-2xl font-bold tracking-tight text-[hsl(var(--text-primary))]">
        Testez votre assistant
      </h2>
      <p className="text-sm text-[hsl(var(--text-muted))]">
        Posez une question pour voir votre IA en action.
      </p>
    </div>
  );

  // Aucun document uploadé → état vide avec invitation à revenir
  if (totalCount === 0) {
    return (
      <div className="space-y-6">
        {header}
        <Card className="surface-raised">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-7 w-7 text-muted-foreground"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-[hsl(var(--text-primary))]">
                Aucun document indexé
              </p>
              <p className="text-sm text-[hsl(var(--text-muted))]">
                Ajoutez un document pour que votre assistant puisse répondre à vos questions.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onBack}>
              ← Ajouter un document
            </Button>
          </CardContent>
        </Card>
        <Button variant="ghost" className="w-full text-[hsl(var(--text-muted))]" onClick={onNext}>
          Continuer sans document
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-[hsl(var(--text-primary))]">
          Testez votre assistant
        </h2>
        <p className="text-sm text-[hsl(var(--text-muted))]">
          Posez une question pour voir votre IA en action.
        </p>
        {isIndexing && (
          <p className="text-xs text-amber-400/80">
            Vos documents sont encore en cours d'indexation — les réponses s'amélioreront dans
            quelques instants.
          </p>
        )}
      </div>

      <IndexingBanner indexed={indexedCount} total={totalCount} progress={indexingProgress} />

      <Card className="surface-raised overflow-hidden">
        <ChatInterface
          messages={messages}
          onSendMessage={sendMessage}
          isLoading={isStreaming}
          aiName={ai.name}
          welcomeMessage={`Bonjour ! Je suis ${ai.name}. Comment puis-je vous aider ?`}
          className="h-[380px]"
        />
      </Card>

      <Button size="lg" className="bg-gradient-primary w-full" onClick={onNext}>
        Continuer
      </Button>
    </div>
  );
}

// ─── Step 5: Share ────────────────────────────────────────────

interface StepShareProps {
  ai: CreatedAI;
  isIndexing: boolean;
  indexedCount: number;
  totalCount: number;
  indexingProgress: number;
  onFinish: () => void;
}

function StepShare({
  ai,
  isIndexing,
  indexedCount,
  totalCount,
  indexingProgress,
  onFinish,
}: StepShareProps) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://corpusai.io';
  const chatUrl = `${origin}/chat/${ai.slug}`;
  const embedCode = `<script src="${origin}/embed.js" data-ai="${ai.slug}" defer></script>`;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-[hsl(var(--text-primary))]">
          Partagez votre assistant
        </h2>
        <p className="text-sm text-[hsl(var(--text-muted))]">
          Votre IA est prête. Partagez-la ou intégrez-la sur votre site.
        </p>
      </div>

      <IndexingBanner indexed={indexedCount} total={totalCount} progress={indexingProgress} />

      <div className="space-y-4">
        <Card className="surface-raised">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[hsl(var(--text-secondary))]">
              Lien direct
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Input
              value={chatUrl}
              readOnly
              className="font-mono text-xs text-[hsl(var(--text-secondary))]"
            />
            <CopyButton value={chatUrl} />
          </CardContent>
        </Card>

        <Card className="surface-raised">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[hsl(var(--text-secondary))]">
              Intégrer sur votre site
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <pre className="overflow-x-auto rounded-lg bg-[hsl(var(--surface-0))] px-4 py-3 font-mono text-xs text-[hsl(var(--text-secondary))]">
              {embedCode}
            </pre>
            <div className="absolute right-6 top-5">
              <CopyButton value={embedCode} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Button size="lg" className="bg-gradient-primary w-full" onClick={onFinish}>
        Accéder à mon assistant
      </Button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────

const DEBUG_AI: CreatedAI = {
  id: 'debug-ai-id',
  slug: 'debug-ai',
  name: 'Debug AI',
};

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDebug = searchParams.get('debug') === 'true';

  const { data: session, isPending } = authClient.useSession();
  const [step, setStep] = React.useState<WizardStep>(isDebug ? 1 : 0);
  const [createdAI, setCreatedAI] = React.useState<CreatedAI | null>(isDebug ? DEBUG_AI : null);
  const [hasDocuments, setHasDocuments] = React.useState(false);

  // Hook remonté ici pour partager l'état d'indexation entre les steps 2, 3 et 4
  const { uploadedFiles, uploadFiles, removeFile, indexingProgress } = useDocumentUpload({
    aiId: createdAI?.id ?? '',
  });

  React.useEffect(() => {
    if (!isPending && !session) {
      router.push('/sign-in');
    }
  }, [session, isPending, router]);

  const firstName = session?.user?.name?.split(' ')[0] ?? 'là';

  const indexedCount = uploadedFiles.filter((f) => f.status === 'success').length;
  const totalCount = uploadedFiles.filter((f) => f.status !== 'error').length;
  const isIndexing =
    totalCount > 0 &&
    uploadedFiles.some((f) => f.status === 'uploading' || f.status === 'processing');

  const handleAICreated = React.useCallback((ai: CreatedAI) => {
    setCreatedAI(ai);
    setStep(2);
  }, []);

  const handlePersonalizeNext = React.useCallback(() => {
    setStep(3);
  }, []);

  const handlePersonalizeSkip = React.useCallback(() => {
    setStep(3);
  }, []);

  const handleDocumentsNext = React.useCallback(() => {
    setHasDocuments(true);
    setStep(4);
  }, []);

  const handleDocumentsSkip = React.useCallback(() => {
    setStep(4);
  }, []);

  const handleChatNext = React.useCallback(() => {
    setStep(5);
  }, []);

  const handleFinish = React.useCallback(() => {
    if (createdAI) {
      router.push(`/ais/${createdAI.id}?fromOnboarding=true`);
    }
  }, [createdAI, router]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-[hsl(var(--text-muted))]">Chargement…</div>
      </div>
    );
  }

  return (
    <div className="bg-page flex min-h-screen flex-col items-center justify-center px-4 py-12">
      {isDebug && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3">
          <p className="mb-2 text-xs font-semibold text-yellow-400">Debug — step navigation</p>
          <div className="flex gap-1">
            {([0, 1, 2, 3, 4, 5] as WizardStep[]).map((s) => (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={cn(
                  'h-7 w-7 rounded font-mono text-xs transition-colors',
                  step === s
                    ? 'bg-yellow-500 text-black'
                    : 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/40'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="w-full max-w-lg animate-fade-in-up space-y-8">
        <Stepper currentStep={step} />

        {step === 0 && <StepWelcome firstName={firstName} onNext={() => setStep(1)} />}

        {step === 1 && <StepCreateAI onCreated={handleAICreated} />}

        {step === 2 && createdAI && (
          <StepPersonalize
            ai={createdAI}
            onNext={handlePersonalizeNext}
            onSkip={handlePersonalizeSkip}
          />
        )}

        {step === 3 && createdAI && (
          <StepUpload
            uploadedFiles={uploadedFiles}
            uploadFiles={uploadFiles}
            removeFile={removeFile}
            onNext={handleDocumentsNext}
            onSkip={handleDocumentsSkip}
          />
        )}

        {step === 4 && createdAI && (
          <StepTestChat
            ai={createdAI}
            hasDocuments={hasDocuments}
            isIndexing={isIndexing}
            indexedCount={indexedCount}
            totalCount={totalCount}
            indexingProgress={indexingProgress}
            onNext={handleChatNext}
            onBack={() => setStep(3)}
          />
        )}

        {step === 5 && createdAI && (
          <StepShare
            ai={createdAI}
            isIndexing={isIndexing}
            indexedCount={indexedCount}
            totalCount={totalCount}
            indexingProgress={indexingProgress}
            onFinish={handleFinish}
          />
        )}
      </div>
    </div>
  );
}

'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@corpusai/ui';
import { authClient } from '@/lib/auth-client';
import { useDocumentUpload } from '@/app/(dashboard)/ais/[id]/hooks/use-document-upload';
import { StepWelcome } from './components/step-welcome';
import { StepCreateAI, type CreatedAI } from './components/step-create-ai';
import { StepPersonalize } from './components/step-personalize';
import { StepUpload } from './components/step-upload';
import { StepTestChat } from './components/step-test-chat';
import { StepShare } from './components/step-share';

// ─── Constants ────────────────────────────────────────────────

const STEP_COUNT = 5;

type WizardStep = 0 | 1 | 2 | 3 | 4 | 5;

const DEBUG_AI: CreatedAI = {
  id: 'debug-ai-id',
  slug: 'debug-ai',
  name: 'Debug AI',
};

// ─── Stepper ──────────────────────────────────────────────────

function Stepper({ currentStep }: { currentStep: WizardStep }) {
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

// ─── Main Page ────────────────────────────────────────────────

export default function OnboardingPageWrapper() {
  return (
    <React.Suspense>
      <OnboardingPage />
    </React.Suspense>
  );
}

function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDebug = searchParams.get('debug') === 'true';

  const { data: session, isPending } = authClient.useSession();
  const [step, setStep] = React.useState<WizardStep>(isDebug ? 1 : 0);
  const [createdAI, setCreatedAI] = React.useState<CreatedAI | null>(isDebug ? DEBUG_AI : null);
  const [hasDocuments, setHasDocuments] = React.useState(false);

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
          <StepPersonalize ai={createdAI} onNext={() => setStep(3)} onSkip={() => setStep(3)} />
        )}

        {step === 3 && createdAI && (
          <StepUpload
            uploadedFiles={uploadedFiles}
            uploadFiles={uploadFiles}
            removeFile={removeFile}
            onNext={() => {
              setHasDocuments(true);
              setStep(4);
            }}
            onSkip={() => setStep(4)}
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
            onNext={() => setStep(5)}
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

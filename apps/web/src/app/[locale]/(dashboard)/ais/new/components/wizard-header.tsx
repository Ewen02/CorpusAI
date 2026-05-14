'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { TOTAL_STEPS, WIZARD_STEPS, type WizardStep } from '../constants';

interface WizardHeaderProps {
  currentStep: WizardStep;
}

export function WizardHeader({ currentStep }: WizardHeaderProps) {
  const t = useTranslations('aiNewWizard');
  const currentIndex = WIZARD_STEPS.indexOf(currentStep);

  return (
    <div className="mb-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-tx-primary">{t('title')}</h1>
          <p className="mt-1 text-sm text-tx-muted">{t('subtitle')}</p>
        </div>
        <p className="shrink-0 text-[12px] font-medium uppercase tracking-wide text-tx-muted">
          {t('stepCounter', { current: currentIndex + 1, total: TOTAL_STEPS })}
        </p>
      </div>

      <div className="mt-5 flex items-center gap-2" aria-label="Wizard progress">
        {WIZARD_STEPS.map((step, idx) => {
          const isActive = idx === currentIndex;
          const isDone = idx < currentIndex;
          return (
            <div key={step} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ring-1 transition-colors ${
                  isActive
                    ? 'bg-[hsl(var(--accent-500)/0.15)] text-[hsl(var(--accent-500))] ring-[hsl(var(--accent-500)/0.4)]'
                    : isDone
                      ? 'bg-[hsl(var(--accent-500)/0.08)] text-[hsl(var(--accent-500))] ring-[hsl(var(--accent-500)/0.25)]'
                      : 'bg-[hsl(var(--surface-2))] text-tx-disabled ring-[hsl(var(--border-default))]'
                }`}
              >
                {idx + 1}
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <span
                  className={`text-[12px] font-medium ${
                    isActive ? 'text-tx-primary' : 'text-tx-muted'
                  }`}
                >
                  {t(`steps.${step}.label`)}
                </span>
                <div
                  className={`h-0.5 w-full rounded-full transition-colors ${
                    isActive || isDone
                      ? 'bg-[hsl(var(--accent-500)/0.5)]'
                      : 'bg-[hsl(var(--border-default))]'
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

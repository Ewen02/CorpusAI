'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Input, cn } from '@corpusai/ui';

import { CARD_CLASS, INPUT_CLASS } from '../constants';

interface AppearanceTabProps {
  name: string;
  primaryColor: string;
  welcomeMessage: string;
  setPrimaryColor: (v: string) => void;
  save: () => Promise<void>;
}

export function AppearanceTab({
  name,
  primaryColor,
  welcomeMessage,
  setPrimaryColor,
  save,
}: AppearanceTabProps) {
  const t = useTranslations('aiSettings.appearanceTab');

  return (
    <div className="space-y-6">
      <div className={CARD_CLASS}>
        <div className="mb-5">
          <p className="text-[15px] font-semibold text-tx-primary">{t('title')}</p>
          <p className="mt-0.5 text-[13px] text-tx-muted">{t('description')}</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="primaryColor" className="text-[13px] font-medium text-tx-secondary">
              {t('primaryColor')}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                id="primaryColor"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                onBlur={() => save()}
                className="h-9 w-16 cursor-pointer rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-0.5"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                onBlur={() => save()}
                pattern="^#[0-9A-Fa-f]{6}$"
                className={cn(INPUT_CLASS, 'w-32 font-mono')}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="mt-6 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] p-4">
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-tx-disabled">
              {t('preview')}
            </p>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400/20 to-indigo-600/10 text-[13px] font-semibold text-[hsl(var(--accent-500))] ring-1 ring-[hsl(var(--accent-500)/0.2)]">
                {name ? name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="flex-1">
                <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-[hsl(var(--surface-1))] px-3.5 py-2 text-[13px] leading-relaxed text-tx-primary">
                  {welcomeMessage || t('defaultWelcome')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

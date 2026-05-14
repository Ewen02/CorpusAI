'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@corpusai/ui';
import { Check, Globe, Link2, Lock, Users } from 'lucide-react';

import { CARD_CLASS, type AccessMode } from '../constants';

interface AccessModeSelectorProps {
  accessMode: AccessMode;
  isPending: boolean;
  onModeChange: (mode: AccessMode) => void;
}

export function AccessModeSelector({
  accessMode,
  isPending,
  onModeChange,
}: AccessModeSelectorProps) {
  const t = useTranslations('aiSettings.accessTab');

  const modeOptions = React.useMemo(
    () => [
      {
        value: 'open' as const,
        label: t('modeOpen'),
        description: t('modeOpenDescription'),
        icon: Globe,
      },
      {
        value: 'token' as const,
        label: t('modeToken'),
        description: t('modeTokenDescription'),
        icon: Link2,
      },
      {
        value: 'code' as const,
        label: t('modeCode'),
        description: t('modeCodeDescription'),
        icon: Lock,
      },
      {
        value: 'invite' as const,
        label: t('modeInvite'),
        description: t('modeInviteDescription'),
        icon: Users,
      },
    ],
    [t]
  );

  return (
    <div className={CARD_CLASS}>
      <div className="mb-5">
        <p className="text-[15px] font-semibold text-tx-primary">{t('modeTitle')}</p>
        <p className="mt-0.5 text-[13px] text-tx-muted">{t('modeDescription')}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {modeOptions.map((opt) => {
          const Icon = opt.icon;
          const isActive = accessMode === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onModeChange(opt.value)}
              disabled={isPending}
              className={cn(
                'relative rounded-lg border p-3 text-left transition-colors',
                isActive
                  ? 'border-[hsl(var(--accent-500)/0.4)] bg-[hsl(var(--accent-500)/0.08)]'
                  : 'border-[hsl(var(--border-default))] hover:bg-[hsl(var(--surface-2))]',
                isPending && 'cursor-not-allowed opacity-60'
              )}
            >
              {isActive && (
                <Check className="absolute right-2 top-2 h-3 w-3 text-[hsl(var(--accent-500))]" />
              )}
              <Icon
                className={cn(
                  'mb-2 h-5 w-5',
                  isActive ? 'text-[hsl(var(--accent-500))]' : 'text-tx-muted'
                )}
              />
              <p
                className={cn(
                  'text-[13px] font-medium',
                  isActive ? 'text-[hsl(var(--accent-500))]' : 'text-tx-primary'
                )}
              >
                {opt.label}
              </p>
              <p className="mt-0.5 text-[12px] text-tx-muted">{opt.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

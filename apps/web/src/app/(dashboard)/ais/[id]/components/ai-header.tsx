'use client';

import * as React from 'react';
import {
  Badge,
  Button,
  cn,
  DocumentIcon,
  ChatIcon,
  QuestionIcon,
  SettingsIcon,
  ShareIcon,
} from '@corpusai/ui';
import { AI_STATUS_CONFIG } from '@/lib/constants';
import type { AI } from '@corpusai/types';

interface AIHeaderProps {
  ai: AI;
  onSettings: () => void;
  onShare?: () => void;
}

export const AIHeader = React.memo(function AIHeader({ ai, onSettings, onShare }: AIHeaderProps) {
  const statusConfig = AI_STATUS_CONFIG[ai.status];
  const initial = ai.name.charAt(0).toUpperCase();

  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      {/* Left: avatar + infos */}
      <div className="flex items-start gap-4">
        {/* Avatar — gradient indigo cohérent avec AICard */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400/20 to-indigo-600/10 text-[18px] font-bold text-[hsl(var(--accent-500))] ring-1 ring-[hsl(var(--accent-500)/0.2)]">
          {initial}
        </div>

        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-tx-primary">{ai.name}</h1>
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  ai.status === 'ACTIVE'
                    ? 'animate-pulse bg-[hsl(var(--success))] shadow-[0_0_6px_hsl(var(--success)/0.6)]'
                    : ai.status === 'DRAFT'
                      ? 'bg-[hsl(var(--warning))]'
                      : 'bg-tx-disabled/40'
                )}
              />
              <Badge variant={statusConfig.variant} className="text-[11px]">
                {statusConfig.label}
              </Badge>
            </div>
          </div>

          {ai.description && <p className="mt-1 text-[13px] text-tx-muted">{ai.description}</p>}

          {/* Stats inline */}
          <div className="mt-3 flex items-center gap-3 text-[12px] text-tx-muted">
            <span className="flex items-center gap-1.5">
              <DocumentIcon className="h-3.5 w-3.5 opacity-60" />
              {ai.documentCount} docs
            </span>
            <span className="h-3 w-px bg-[hsl(var(--border-default))]" />
            <span className="flex items-center gap-1.5">
              <ChatIcon className="h-3.5 w-3.5 opacity-60" />
              {ai.conversationCount} conversations
            </span>
            <span className="h-3 w-px bg-[hsl(var(--border-default))]" />
            <span className="flex items-center gap-1.5">
              <QuestionIcon className="h-3.5 w-3.5 opacity-60" />
              {ai.questionCount} questions
            </span>
          </div>
        </div>
      </div>

      {/* Right: action buttons */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onSettings}>
          <SettingsIcon className="mr-1.5 h-3.5 w-3.5" />
          Paramètres
        </Button>
        {onShare && (
          <Button variant="outline" size="sm" onClick={onShare}>
            <ShareIcon className="mr-1.5 h-3.5 w-3.5" />
            Partager
          </Button>
        )}
      </div>
    </div>
  );
});

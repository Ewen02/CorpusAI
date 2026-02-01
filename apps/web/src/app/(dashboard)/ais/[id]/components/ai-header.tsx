'use client';

import * as React from 'react';
import {
  Badge,
  Button,
  Separator,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  DocumentIcon,
  ChatIcon,
  QuestionIcon,
  SettingsIcon,
  ShareIcon,
} from '@corpusai/ui';
import { AI_STATUS_CONFIG, AI_STATUS_BADGE_CLASS } from '@/lib/constants';
import type { AI } from '@corpusai/types';

interface AIHeaderProps {
  ai: AI;
  onSettings: () => void;
  onShare?: () => void;
}

/**
 * Header component for the AI detail page.
 * Displays AI name, status, stats, and action buttons.
 */
export const AIHeader = React.memo(function AIHeader({
  ai,
  onSettings,
  onShare,
}: AIHeaderProps) {
  const statusConfig = AI_STATUS_CONFIG[ai.status];

  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{ai.name}</h1>
          <Badge className={AI_STATUS_BADGE_CLASS[ai.status]}>
            {statusConfig.label}
          </Badge>
        </div>
        {ai.description && (
          <p className="text-muted-foreground mt-2">{ai.description}</p>
        )}
        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-1">
                <DocumentIcon className="h-4 w-4" />
                {ai.documentCount} documents
              </span>
            </TooltipTrigger>
            <TooltipContent>Documents indexes</TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="h-4" />
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-1">
                <ChatIcon className="h-4 w-4" />
                {ai.conversationCount} conversations
              </span>
            </TooltipTrigger>
            <TooltipContent>Conversations totales</TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="h-4" />
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-1">
                <QuestionIcon className="h-4 w-4" />
                {ai.questionCount} questions
              </span>
            </TooltipTrigger>
            <TooltipContent>Questions posees</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onSettings}>
          <SettingsIcon className="h-4 w-4 mr-2" />
          Parametres
        </Button>
        <Button variant="outline" onClick={onShare}>
          <ShareIcon className="h-4 w-4 mr-2" />
          Partager
        </Button>
      </div>
    </div>
  );
});

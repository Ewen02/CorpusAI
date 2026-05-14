'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useGenerateSuggestions, type AISuggestions } from '@/lib/queries';
import { ApiError } from '@/lib/api-client';

interface SuggestionTargets {
  setDescription: (v: string) => void;
  setSystemPrompt: (v: string) => void;
  setWelcomeMessage: (v: string) => void;
}

export interface UseAISuggestionsResult {
  suggestions: Partial<AISuggestions>;
  isPending: boolean;
  generateError: string | null;
  handleGenerate: () => Promise<void>;
  acceptSuggestion: (field: keyof AISuggestions) => void;
  dismissSuggestion: (field: keyof AISuggestions) => void;
}

export function useAISuggestions(aiId: string, targets: SuggestionTargets): UseAISuggestionsResult {
  const t = useTranslations('aiSettings');
  const generateSuggestionsMutation = useGenerateSuggestions();

  const [suggestions, setSuggestions] = React.useState<Partial<AISuggestions>>({});
  const [generateError, setGenerateError] = React.useState<string | null>(null);

  const handleGenerate = React.useCallback(async () => {
    setGenerateError(null);
    try {
      const result = await generateSuggestionsMutation.mutateAsync(aiId);
      setSuggestions(result);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setGenerateError(t('basicInfo.suggestionsUnavailable'));
      } else {
        setGenerateError(t('generateError'));
      }
    }
  }, [aiId, generateSuggestionsMutation, t]);

  const acceptSuggestion = React.useCallback(
    (field: keyof AISuggestions) => {
      setSuggestions((prev) => {
        const value = prev[field];
        if (!value) return prev;
        if (field === 'description') targets.setDescription(value);
        if (field === 'systemPrompt') targets.setSystemPrompt(value);
        if (field === 'welcomeMessage') targets.setWelcomeMessage(value);
        return { ...prev, [field]: undefined };
      });
    },
    [targets]
  );

  const dismissSuggestion = React.useCallback((field: keyof AISuggestions) => {
    setSuggestions((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  return {
    suggestions,
    isPending: generateSuggestionsMutation.isPending,
    generateError,
    handleGenerate,
    acceptSuggestion,
    dismissSuggestion,
  };
}

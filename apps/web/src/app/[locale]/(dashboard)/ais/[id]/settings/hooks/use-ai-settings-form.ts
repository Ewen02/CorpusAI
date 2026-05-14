'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import type { AI, AICategory } from '@corpusai/types';
import { useUpdateAI } from '@/lib/queries';

import type { AIStatus, SaveStatus } from '../constants';

export interface AISettingsFormState {
  name: string;
  description: string;
  systemPrompt: string;
  welcomeMessage: string;
  primaryColor: string;
  isPublic: boolean;
  category: AICategory;
  llmProvider: 'openai' | 'anthropic' | 'groq';
  llmModel: string;
  maxTokens: number;
  temperature: number;
  scoreThreshold: number;
  language: 'fr' | 'en';
  status: AIStatus;
}

export interface AISettingsFormHelpers {
  setName: (v: string) => void;
  setDescription: (v: string) => void;
  setSystemPrompt: (v: string) => void;
  setWelcomeMessage: (v: string) => void;
  setPrimaryColor: (v: string) => void;
  setIsPublic: (v: boolean) => void;
  setCategory: (v: AICategory) => void;
  setLlmProvider: (v: 'openai' | 'anthropic' | 'groq') => void;
  setLlmModel: (v: string) => void;
  setMaxTokens: (v: number) => void;
  setTemperature: (v: number) => void;
  setScoreThreshold: (v: number) => void;
  setLanguage: (v: 'fr' | 'en') => void;
  setStatus: (v: AIStatus) => void;
}

export type SaveOverrides = Partial<Pick<AISettingsFormState, 'isPublic' | 'status'>>;

export interface UseAISettingsFormResult extends AISettingsFormState, AISettingsFormHelpers {
  saveStatus: SaveStatus;
  saveError: string | null;
  save: (overrides?: SaveOverrides) => Promise<void>;
}

export function useAISettingsForm(aiId: string, ai: AI | undefined): UseAISettingsFormResult {
  const t = useTranslations('aiSettings');
  const updateAI = useUpdateAI();

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [systemPrompt, setSystemPrompt] = React.useState('');
  const [welcomeMessage, setWelcomeMessage] = React.useState('');
  const [primaryColor, setPrimaryColor] = React.useState('#3b82f6');
  const [isPublic, setIsPublic] = React.useState(true);
  const [category, setCategory] = React.useState<AICategory>('OTHER');
  const [llmProvider, setLlmProvider] = React.useState<'openai' | 'anthropic' | 'groq'>('openai');
  const [llmModel, setLlmModel] = React.useState('gpt-4o-mini');
  const [maxTokens, setMaxTokens] = React.useState(1024);
  const [temperature, setTemperature] = React.useState(0.7);
  const [scoreThreshold, setScoreThreshold] = React.useState(0.6);
  const [language, setLanguage] = React.useState<'fr' | 'en'>('fr');
  const [status, setStatus] = React.useState<AIStatus>('DRAFT');

  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>('idle');
  const [saveError, setSaveError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (ai) {
      setName(ai.name || '');
      setDescription(ai.description || '');
      setSystemPrompt(ai.systemPrompt || '');
      setWelcomeMessage(ai.welcomeMessage || '');
      setPrimaryColor(ai.primaryColor || '#3b82f6');
      setIsPublic(ai.isPublic ?? true);
      setCategory((ai.category as AICategory) || 'OTHER');
      setLlmProvider(
        (((ai as unknown as Record<string, unknown>).llmProvider as
          | 'openai'
          | 'anthropic'
          | 'groq'
          | undefined) || 'openai') as 'openai' | 'anthropic' | 'groq'
      );
      setLlmModel(((ai as unknown as Record<string, unknown>).llmModel as string) || 'gpt-4o-mini');
      setMaxTokens(ai.maxTokens || 1024);
      setTemperature(ai.temperature || 0.7);
      setScoreThreshold(ai.scoreThreshold || 0.6);
      setLanguage((ai.language as 'fr' | 'en') || 'fr');
      setStatus((ai.status as AIStatus) || 'DRAFT');
    }
  }, [ai]);

  const save = React.useCallback(
    async (overrides?: SaveOverrides) => {
      setSaveStatus('saving');
      setSaveError(null);
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
            llmProvider,
            llmModel,
            maxTokens,
            temperature,
            scoreThreshold,
            language,
            status,
            ...overrides,
          },
        });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        setSaveStatus('error');
        setSaveError(err instanceof Error ? err.message : t('errorGeneric'));
      }
    },
    [
      aiId,
      updateAI,
      name,
      description,
      systemPrompt,
      welcomeMessage,
      primaryColor,
      isPublic,
      category,
      llmProvider,
      llmModel,
      maxTokens,
      temperature,
      scoreThreshold,
      language,
      status,
      t,
    ]
  );

  return {
    name,
    description,
    systemPrompt,
    welcomeMessage,
    primaryColor,
    isPublic,
    category,
    llmProvider,
    llmModel,
    maxTokens,
    temperature,
    scoreThreshold,
    language,
    status,
    setName,
    setDescription,
    setSystemPrompt,
    setWelcomeMessage,
    setPrimaryColor,
    setIsPublic,
    setCategory,
    setLlmProvider,
    setLlmModel,
    setMaxTokens,
    setTemperature,
    setScoreThreshold,
    setLanguage,
    setStatus,
    saveStatus,
    saveError,
    save,
  };
}

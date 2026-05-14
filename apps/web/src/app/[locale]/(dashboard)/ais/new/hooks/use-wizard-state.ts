'use client';

import * as React from 'react';
import {
  DEFAULT_LANGUAGE,
  DEFAULT_MAX_TOKENS,
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_TEMPERATURE,
  SYSTEM_PROMPT_TEMPLATES,
  WELCOME_SUGGESTIONS,
  WIZARD_STORAGE_KEY,
  type AccessMode,
  type WizardCategoryId,
  type WizardStep,
} from '../constants';

export interface WizardState {
  step: WizardStep;
  // Step 1
  name: string;
  description: string;
  category: WizardCategoryId;
  systemPrompt: string;
  systemPromptTouched: boolean;
  // Step 2
  createdAIId: string | null;
  documentsSkipped: boolean;
  // Step 3
  slug: string;
  slugTouched: boolean;
  accessMode: AccessMode;
  welcomeMessage: string;
}

const INITIAL_STATE: WizardState = {
  step: 'basics',
  name: '',
  description: '',
  category: 'OTHER',
  systemPrompt: SYSTEM_PROMPT_TEMPLATES.OTHER,
  systemPromptTouched: false,
  createdAIId: null,
  documentsSkipped: false,
  slug: '',
  slugTouched: false,
  accessMode: 'OPEN',
  welcomeMessage: WELCOME_SUGGESTIONS.OTHER[0],
};

function isValidState(value: unknown): value is WizardState {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<WizardState>;
  return (
    typeof v.step === 'string' &&
    ['basics', 'documents', 'publish'].includes(v.step) &&
    typeof v.name === 'string' &&
    typeof v.category === 'string'
  );
}

function loadState(): WizardState {
  if (typeof window === 'undefined') return INITIAL_STATE;
  try {
    const raw = window.sessionStorage.getItem(WIZARD_STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    const parsed: unknown = JSON.parse(raw);
    if (isValidState(parsed)) {
      return { ...INITIAL_STATE, ...parsed };
    }
  } catch {
    // Ignore corrupt storage — fall back to initial state.
  }
  return INITIAL_STATE;
}

export function useWizardState() {
  const [state, setState] = React.useState<WizardState>(INITIAL_STATE);
  const [hydrated, setHydrated] = React.useState(false);

  // Hydrate from sessionStorage on mount (avoid SSR mismatch).
  React.useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  // Persist on every change after hydration.
  React.useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // SessionStorage may be unavailable in some browsers — silently ignore.
    }
  }, [state, hydrated]);

  const update = React.useCallback(<K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const patch = React.useCallback((delta: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...delta }));
  }, []);

  const goToStep = React.useCallback((step: WizardStep) => {
    setState((prev) => ({ ...prev, step }));
  }, []);

  const reset = React.useCallback(() => {
    setState(INITIAL_STATE);
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(WIZARD_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }, []);

  return { state, update, patch, goToStep, reset, hydrated };
}

export const WIZARD_DEFAULTS = {
  primaryColor: DEFAULT_PRIMARY_COLOR,
  temperature: DEFAULT_TEMPERATURE,
  maxTokens: DEFAULT_MAX_TOKENS,
  language: DEFAULT_LANGUAGE,
};

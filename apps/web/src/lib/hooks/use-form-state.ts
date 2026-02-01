import { useState, useCallback } from 'react';

interface FormState {
  error: string | null;
  success: string | null;
  isLoading: boolean;
}

export function useFormState(initialLoading = false) {
  const [state, setState] = useState<FormState>({
    error: null,
    success: null,
    isLoading: initialLoading,
  });

  const setError = useCallback((error: string | null) => {
    setState((s) => ({ ...s, error, success: null }));
  }, []);

  const setSuccess = useCallback((success: string | null) => {
    setState((s) => ({ ...s, success, error: null }));
  }, []);

  const setLoading = useCallback((isLoading: boolean) => {
    setState((s) => ({ ...s, isLoading }));
  }, []);

  const reset = useCallback(() => {
    setState({ error: null, success: null, isLoading: false });
  }, []);

  const clearMessages = useCallback(() => {
    setState((s) => ({ ...s, error: null, success: null }));
  }, []);

  return {
    ...state,
    setError,
    setSuccess,
    setLoading,
    reset,
    clearMessages,
  };
}

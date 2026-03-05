import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormState } from './use-form-state';

describe('useFormState', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useFormState());
    expect(result.current.error).toBeNull();
    expect(result.current.success).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should initialize with custom loading state', () => {
    const { result } = renderHook(() => useFormState(true));
    expect(result.current.isLoading).toBe(true);
  });

  it('should set error and clear success', () => {
    const { result } = renderHook(() => useFormState());

    act(() => result.current.setSuccess('Success!'));
    act(() => result.current.setError('Something went wrong'));

    expect(result.current.error).toBe('Something went wrong');
    expect(result.current.success).toBeNull();
  });

  it('should set success and clear error', () => {
    const { result } = renderHook(() => useFormState());

    act(() => result.current.setError('Error!'));
    act(() => result.current.setSuccess('All good'));

    expect(result.current.success).toBe('All good');
    expect(result.current.error).toBeNull();
  });

  it('should set loading state', () => {
    const { result } = renderHook(() => useFormState());

    act(() => result.current.setLoading(true));
    expect(result.current.isLoading).toBe(true);

    act(() => result.current.setLoading(false));
    expect(result.current.isLoading).toBe(false);
  });

  it('should reset all state', () => {
    const { result } = renderHook(() => useFormState());

    act(() => {
      result.current.setError('Error');
      result.current.setLoading(true);
    });

    act(() => result.current.reset());

    expect(result.current.error).toBeNull();
    expect(result.current.success).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should clear messages without affecting loading', () => {
    const { result } = renderHook(() => useFormState());

    act(() => {
      result.current.setError('Error');
      result.current.setLoading(true);
    });

    act(() => result.current.clearMessages());

    expect(result.current.error).toBeNull();
    expect(result.current.success).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });
});

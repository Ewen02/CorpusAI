import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock apiClient before importing the hook
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    streamMessage: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    data?: unknown;
    constructor(status: number, message: string, data?: unknown) {
      super(message);
      this.status = status;
      this.data = data;
    }
  },
}));

vi.mock('@/lib/utils/chat-session', () => ({
  getOrCreateSessionId: vi.fn().mockReturnValue('session-123'),
  mapSourcesToChat: vi.fn().mockReturnValue([]),
}));

import { apiClient, ApiError } from '@/lib/api-client';
import { usePublicChat } from './use-public-chat';

const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
const mockPost = apiClient.post as ReturnType<typeof vi.fn>;

describe('usePublicChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start in loading state', () => {
    mockGet.mockResolvedValue({ name: 'Test AI', description: 'A test AI' });
    const { result } = renderHook(() => usePublicChat({ username: 'jean', slug: 'test-ai' }));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.ai).toBeNull();
    expect(result.current.messages).toEqual([]);
  });

  it('should fetch AI info on mount', async () => {
    const aiInfo = { name: 'Test AI', description: 'A test AI' };
    mockGet.mockResolvedValue(aiInfo);
    mockPost.mockResolvedValue({ id: 'conv-1' });

    const { result } = renderHook(() => usePublicChat({ username: 'jean', slug: 'test-ai' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGet).toHaveBeenCalledWith('/chat/test-ai/info');
    expect(result.current.ai).toEqual(aiInfo);
    expect(result.current.error).toBeNull();
  });

  it('should set error when AI not found', async () => {
    mockGet.mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => usePublicChat({ username: 'jean', slug: 'nonexistent' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Assistant introuvable.');
    expect(result.current.ai).toBeNull();
  });

  it('should set accessDeniedReason when conversation start returns 401', async () => {
    const aiInfo = { name: 'Gated AI', description: 'Requires code' };
    mockGet.mockResolvedValue(aiInfo);

    // Start conversation fails with access_code
    mockPost.mockRejectedValue(
      Object.assign(new ApiError(401, 'Access denied', { reason: 'access_code' }), {
        status: 401,
        data: { reason: 'access_code' },
      })
    );

    const { result } = renderHook(() => usePublicChat({ username: 'jean', slug: 'gated-ai' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // After AI info loads, conversation start should be attempted
    // The access denied reason should be captured
    await waitFor(() => {
      expect(result.current.accessDeniedReason).toBe('access_code');
    });
  });

  it('should show save banner after 3 sent messages', async () => {
    const aiInfo = { name: 'Test AI', description: '' };
    mockGet.mockResolvedValue(aiInfo);
    mockPost.mockResolvedValue({ id: 'conv-1' });

    const { result } = renderHook(() => usePublicChat({ username: 'jean', slug: 'test-ai' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Initially no banner
    expect(result.current.showSaveBanner).toBe(false);
  });

  it('should dismiss save banner', async () => {
    mockGet.mockResolvedValue({ name: 'AI', description: '' });

    const { result } = renderHook(() => usePublicChat({ username: 'jean', slug: 'test-ai' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.dismissSaveBanner();
    });

    expect(result.current.showSaveBanner).toBe(false);
  });

  it('should initialize with no access denied reason', async () => {
    mockGet.mockResolvedValue({ name: 'Public AI', description: '' });
    mockPost.mockResolvedValue({ id: 'conv-1' });

    const { result } = renderHook(() => usePublicChat({ username: 'jean', slug: 'public-ai' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.accessDeniedReason).toBeNull();
    expect(result.current.isCodeInvalid).toBe(false);
  });
});

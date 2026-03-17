import type { MessageSource } from '@/lib/api-client';
import type { ChatSource } from '@corpusai/ui';

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return generateSessionId();

  try {
    let sessionId = sessionStorage.getItem('corpusai_session_id');
    if (!sessionId) {
      sessionId = generateSessionId();
      sessionStorage.setItem('corpusai_session_id', sessionId);
    }
    return sessionId;
  } catch {
    return generateSessionId();
  }
}

export function mapSourcesToChat(sources: MessageSource[]): ChatSource[] {
  return sources.map((source) => ({
    documentId: source.chunkId || '',
    documentName: source.documentSource || 'Document',
    excerpt: source.excerpt || '',
    relevanceScore: source.score || 0,
  }));
}

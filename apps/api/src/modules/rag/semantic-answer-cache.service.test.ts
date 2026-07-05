import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SemanticAnswerCacheService } from './semantic-answer-cache.service';
import type { RagPipelineFactory } from './rag-pipeline.factory';

/** Embedding jouet : direction dominante contrôlée pour piloter la similarité */
const vec = (x: number, y: number): number[] => [x, y, 0, 0];

describe('SemanticAnswerCacheService', () => {
  let redis: {
    get: ReturnType<typeof vi.fn>;
    lrange: ReturnType<typeof vi.fn>;
    incr: ReturnType<typeof vi.fn>;
    multi: ReturnType<typeof vi.fn>;
  };
  let embed: ReturnType<typeof vi.fn>;
  let service: SemanticAnswerCacheService;

  const makeEntry = (embedding: number[], answer: string) =>
    JSON.stringify({
      embedding,
      question: 'q',
      answer,
      sources: [{ chunkId: 'c1' }],
      confidence: 'HIGH',
      createdAt: new Date().toISOString(),
    });

  beforeEach(() => {
    const multiChain = {
      lpush: vi.fn().mockReturnThis(),
      ltrim: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    };
    redis = {
      get: vi.fn().mockResolvedValue('3'),
      lrange: vi.fn().mockResolvedValue([]),
      incr: vi.fn().mockResolvedValue(4),
      multi: vi.fn().mockReturnValue(multiChain),
    };
    embed = vi.fn().mockResolvedValue(vec(1, 0));

    const factory = {
      getRedis: vi.fn().mockReturnValue(redis),
      getEmbeddingService: vi.fn().mockReturnValue({ embed }),
    };
    service = new SemanticAnswerCacheService(factory as unknown as RagPipelineFactory);
  });

  it('is a no-op when Redis is not configured', async () => {
    const factory = {
      getRedis: vi.fn().mockReturnValue(null),
      getEmbeddingService: vi.fn(),
    };
    const disabled = new SemanticAnswerCacheService(factory as unknown as RagPipelineFactory);

    expect(disabled.isEnabled).toBe(false);
    expect(await disabled.lookup('ai-1', 'question')).toBeNull();
    await expect(disabled.store('ai-1', 'q', 'a', [], 'HIGH')).resolves.toBeUndefined();
    await expect(disabled.invalidate('ai-1')).resolves.toBeUndefined();
  });

  it('returns a hit when a cached question is semantically identical', async () => {
    redis.lrange.mockResolvedValue([makeEntry(vec(1, 0), 'réponse cachée')]);

    const hit = await service.lookup('ai-1', 'même question');

    expect(hit).not.toBeNull();
    expect(hit!.answer).toBe('réponse cachée');
    // La clé de liste utilise la version courante
    expect(redis.lrange).toHaveBeenCalledWith('anscache:ai-1:3:entries', 0, 49);
  });

  it('returns null when similarity is below the threshold', async () => {
    // Vecteur orthogonal → cosinus 0
    redis.lrange.mockResolvedValue([makeEntry(vec(0, 1), 'autre sujet')]);

    expect(await service.lookup('ai-1', 'question différente')).toBeNull();
  });

  it('picks the most similar entry above the threshold', async () => {
    // 0.98 vs 1.0 de similarité — les deux passent le seuil, la meilleure gagne
    const slightlyOff = [0.98, Math.sqrt(1 - 0.98 * 0.98), 0, 0];
    redis.lrange.mockResolvedValue([
      makeEntry(slightlyOff, 'proche'),
      makeEntry(vec(1, 0), 'identique'),
    ]);

    const hit = await service.lookup('ai-1', 'q');

    expect(hit!.answer).toBe('identique');
  });

  it('ignores corrupt entries and mismatched embedding dimensions', async () => {
    redis.lrange.mockResolvedValue([
      'pas du json',
      JSON.stringify({ embedding: [1], answer: 'dim différente' }),
      makeEntry(vec(1, 0), 'valide'),
    ]);

    const hit = await service.lookup('ai-1', 'q');

    expect(hit!.answer).toBe('valide');
  });

  it('returns null (never throws) when Redis fails', async () => {
    redis.get.mockRejectedValue(new Error('redis down'));

    expect(await service.lookup('ai-1', 'q')).toBeNull();
  });

  it('stores entries in the versioned list with trim and TTL', async () => {
    await service.store('ai-1', 'question', 'réponse', [], 'HIGH');

    const chain = redis.multi.mock.results[0]!.value as {
      lpush: ReturnType<typeof vi.fn>;
      ltrim: ReturnType<typeof vi.fn>;
      expire: ReturnType<typeof vi.fn>;
    };
    expect(chain.lpush).toHaveBeenCalledWith('anscache:ai-1:3:entries', expect.any(String));
    expect(chain.ltrim).toHaveBeenCalledWith('anscache:ai-1:3:entries', 0, 49);
    expect(chain.expire).toHaveBeenCalledWith('anscache:ai-1:3:entries', 60 * 60 * 24);
  });

  it('invalidate bumps the shared version key', async () => {
    await service.invalidate('ai-1');

    expect(redis.incr).toHaveBeenCalledWith('anscache:ver:ai-1');
  });
});

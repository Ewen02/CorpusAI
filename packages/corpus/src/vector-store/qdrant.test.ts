import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QdrantVectorStore } from './qdrant';

const mockGetCollections = vi.fn();
const mockGetCollection = vi.fn();
const mockCreateCollection = vi.fn();
const mockCreatePayloadIndex = vi.fn();

vi.mock('@qdrant/js-client-rest', () => ({
  QdrantClient: vi.fn().mockImplementation(() => ({
    getCollections: mockGetCollections,
    getCollection: mockGetCollection,
    createCollection: mockCreateCollection,
    createPayloadIndex: mockCreatePayloadIndex,
  })),
}));

describe('QdrantVectorStore.ensureCollection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateCollection.mockResolvedValue(undefined);
    mockCreatePayloadIndex.mockResolvedValue(undefined);
  });

  it('creates the collection with payload indexes when missing', async () => {
    mockGetCollections.mockResolvedValue({ collections: [] });

    const store = new QdrantVectorStore({ url: 'http://localhost:6333', vectorSize: 512 });
    await store.ensureCollection();

    expect(mockCreateCollection).toHaveBeenCalledWith(
      'corpus_vectors',
      expect.objectContaining({
        vectors: { dense: expect.objectContaining({ size: 512 }) },
      })
    );
    // ai_id (is_tenant) + documentId (keyword)
    expect(mockCreatePayloadIndex).toHaveBeenCalledTimes(2);
    expect(mockGetCollection).not.toHaveBeenCalled();
  });

  it('accepts an existing collection with a matching dense vector size', async () => {
    mockGetCollections.mockResolvedValue({ collections: [{ name: 'corpus_vectors' }] });
    mockGetCollection.mockResolvedValue({
      config: { params: { vectors: { dense: { size: 512 } } } },
    });

    const store = new QdrantVectorStore({ url: 'http://localhost:6333', vectorSize: 512 });
    await expect(store.ensureCollection()).resolves.toBeUndefined();

    expect(mockCreateCollection).not.toHaveBeenCalled();
  });

  it('throws an explicit error on dense vector size drift', async () => {
    // Collection existante en 1536d alors que le service est configuré en 512d :
    // sans garde-fou, l'erreur n'apparaîtrait qu'à l'upsert, en plein job d'indexation.
    mockGetCollections.mockResolvedValue({ collections: [{ name: 'corpus_vectors' }] });
    mockGetCollection.mockResolvedValue({
      config: { params: { vectors: { dense: { size: 1536 } } } },
    });

    const store = new QdrantVectorStore({ url: 'http://localhost:6333', vectorSize: 512 });
    await expect(store.ensureCollection()).rejects.toThrow(/1536d dense vectors/);

    expect(mockCreateCollection).not.toHaveBeenCalled();
  });

  it('tolerates an existing collection whose config shape is not readable', async () => {
    // Robustesse : si l'API ne renvoie pas la forme attendue, on ne bloque pas le boot.
    mockGetCollections.mockResolvedValue({ collections: [{ name: 'corpus_vectors' }] });
    mockGetCollection.mockResolvedValue({ config: undefined });

    const store = new QdrantVectorStore({ url: 'http://localhost:6333', vectorSize: 512 });
    await expect(store.ensureCollection()).resolves.toBeUndefined();
  });
});

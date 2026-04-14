import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BullMQDocumentQueueAdapter } from './bullmq.adapter';

describe('BullMQDocumentQueueAdapter', () => {
  let adapter: BullMQDocumentQueueAdapter;
  const mockQueue = {
    add: vi.fn(),
    getFailed: vi.fn(),
    getFailedCount: vi.fn(),
    getJob: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new BullMQDocumentQueueAdapter(mockQueue as any);
  });

  it('add() forwards args to queue.add', async () => {
    const data = { documentId: 'd-1' } as any;
    await adapter.add('process-doc', data);
    expect(mockQueue.add).toHaveBeenCalledWith('process-doc', data, undefined);
  });

  it('getFailedJobs maps Job → FailedJob with fallbacks', async () => {
    mockQueue.getFailed.mockResolvedValue([
      {
        id: 'j-1',
        data: { x: 1 },
        failedReason: 'oops',
        attemptsMade: 2,
        finishedOn: 12345,
        timestamp: 1000,
      },
      {
        id: undefined,
        data: { x: 2 },
        failedReason: undefined,
        attemptsMade: 0,
        finishedOn: undefined,
        timestamp: 2000,
      },
    ]);

    const result = await adapter.getFailedJobs(0, 10);

    expect(result[0]).toEqual({
      jobId: 'j-1',
      data: { x: 1 },
      failedReason: 'oops',
      attemptsMade: 2,
      finishedOn: 12345,
      timestamp: 1000,
    });
    expect(result[1]!.jobId).toBe('');
    expect(result[1]!.failedReason).toBeNull();
    expect(result[1]!.finishedOn).toBeNull();
  });

  it('getFailedCount delegates to queue', async () => {
    mockQueue.getFailedCount.mockResolvedValue(5);
    const result = await adapter.getFailedCount();
    expect(result).toBe(5);
  });

  it('retryJob returns false when job not found', async () => {
    mockQueue.getJob.mockResolvedValue(null);
    const result = await adapter.retryJob('missing');
    expect(result).toBe(false);
  });

  it('retryJob calls job.retry and returns true when found', async () => {
    const job = { retry: vi.fn().mockResolvedValue(undefined) };
    mockQueue.getJob.mockResolvedValue(job);
    const result = await adapter.retryJob('j-1');
    expect(job.retry).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('removeJob returns false when job not found', async () => {
    mockQueue.getJob.mockResolvedValue(null);
    const result = await adapter.removeJob('missing');
    expect(result).toBe(false);
  });

  it('removeJob calls job.remove and returns true when found', async () => {
    const job = { remove: vi.fn().mockResolvedValue(undefined) };
    mockQueue.getJob.mockResolvedValue(job);
    const result = await adapter.removeJob('j-1');
    expect(job.remove).toHaveBeenCalled();
    expect(result).toBe(true);
  });
});

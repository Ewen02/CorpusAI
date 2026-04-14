import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@corpusai/queue', () => ({
  REDIS_CHANNELS: {
    DOCUMENT_PROGRESS: 'document:progress',
    DOCUMENT_FINAL_FAILURE: 'document:final-failure',
  },
}));

import { RedisEventBusAdapter } from './redis-event-bus.adapter';

describe('RedisEventBusAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('onModuleInit is no-op when subscriber is null', async () => {
    const adapter = new RedisEventBusAdapter(null);
    await expect(adapter.onModuleInit()).resolves.toBeUndefined();
  });

  it('subscribes to both progress and final-failure channels', async () => {
    const subscriber = {
      connect: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      quit: vi.fn().mockResolvedValue(undefined),
    };
    const adapter = new RedisEventBusAdapter(subscriber as any);

    await adapter.onModuleInit();

    expect(subscriber.subscribe).toHaveBeenCalledWith(
      'document:progress',
      'document:final-failure'
    );
    expect(subscriber.on).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('emits "progress" when receiving message on DOCUMENT_PROGRESS', async () => {
    let messageHandler: (channel: string, message: string) => void = () => {};
    const subscriber = {
      connect: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockResolvedValue(undefined),
      on: vi.fn((event, handler) => {
        if (event === 'message') messageHandler = handler;
      }),
      quit: vi.fn().mockResolvedValue(undefined),
    };
    const adapter = new RedisEventBusAdapter(subscriber as any);
    await adapter.onModuleInit();

    const listener = vi.fn();
    adapter.getEmitter().on('progress', listener);

    messageHandler('document:progress', JSON.stringify({ documentId: 'd-1', progress: 50 }));

    expect(listener).toHaveBeenCalledWith({ documentId: 'd-1', progress: 50 });
  });

  it('emits "final-failure" when receiving message on DOCUMENT_FINAL_FAILURE', async () => {
    let messageHandler: (channel: string, message: string) => void = () => {};
    const subscriber = {
      connect: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockResolvedValue(undefined),
      on: vi.fn((event, handler) => {
        if (event === 'message') messageHandler = handler;
      }),
      quit: vi.fn().mockResolvedValue(undefined),
    };
    const adapter = new RedisEventBusAdapter(subscriber as any);
    await adapter.onModuleInit();

    const listener = vi.fn();
    adapter.getEmitter().on('final-failure', listener);

    messageHandler('document:final-failure', JSON.stringify({ documentId: 'd-1', error: 'oops' }));

    expect(listener).toHaveBeenCalledWith({ documentId: 'd-1', error: 'oops' });
  });

  it('silently ignores malformed JSON messages', async () => {
    let messageHandler: (channel: string, message: string) => void = () => {};
    const subscriber = {
      connect: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockResolvedValue(undefined),
      on: vi.fn((event, handler) => {
        if (event === 'message') messageHandler = handler;
      }),
      quit: vi.fn().mockResolvedValue(undefined),
    };
    const adapter = new RedisEventBusAdapter(subscriber as any);
    await adapter.onModuleInit();

    const listener = vi.fn();
    adapter.getEmitter().on('progress', listener);

    expect(() => messageHandler('document:progress', 'not-json{{')).not.toThrow();
    expect(listener).not.toHaveBeenCalled();
  });

  it('onModuleDestroy quits subscriber and removes listeners', async () => {
    const subscriber = {
      quit: vi.fn().mockResolvedValue(undefined),
    };
    const adapter = new RedisEventBusAdapter(subscriber as any);

    const listener = vi.fn();
    adapter.getEmitter().on('progress', listener);

    await adapter.onModuleDestroy();

    expect(subscriber.quit).toHaveBeenCalled();
    expect(adapter.getEmitter().listenerCount('progress')).toBe(0);
  });

  it('onModuleDestroy is safe when subscriber is null', async () => {
    const adapter = new RedisEventBusAdapter(null);
    await expect(adapter.onModuleDestroy()).resolves.toBeUndefined();
  });
});

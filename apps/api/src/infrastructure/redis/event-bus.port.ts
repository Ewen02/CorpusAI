import type { EventEmitter } from 'node:events';

export const EVENT_BUS = Symbol('EVENT_BUS');

/**
 * IEventBus abstracts a pub/sub event bus (Redis channels → in-process EventEmitter).
 * Subscribed to at module init, emitted via Node.js EventEmitter for SSE streaming.
 */
export interface IEventBus {
  /**
   * Returns the underlying EventEmitter for consumers (e.g. SSE controllers).
   */
  getEmitter(): EventEmitter;
}

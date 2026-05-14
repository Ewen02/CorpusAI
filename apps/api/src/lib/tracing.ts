/**
 * Lightweight tracing facade.
 *
 * Builds on top of `@sentry/nestjs`, which already auto-instruments HTTP and
 * Prisma. This module adds explicit spans for the RAG pipeline (chunking,
 * embedding, vector search, reranking, generation) so we can see where the
 * latency budget goes per request.
 *
 * If `SENTRY_DSN` is unset, all calls are no-ops with zero runtime cost.
 * If you later wire OpenTelemetry, Sentry can be configured to export OTLP
 * spans (`Sentry.init({ ... transport options ... })`) without touching
 * call sites.
 */
import * as Sentry from '@sentry/nestjs';

export type SpanOp =
  | 'rag.pipeline'
  | 'rag.chunking'
  | 'rag.embedding'
  | 'rag.vector_search'
  | 'rag.rerank'
  | 'rag.generate'
  | 'rag.stream'
  | 'document.parse'
  | 'document.process'
  | 'queue.enqueue'
  | 'mail.send'
  | 'webhook.deliver';

export interface SpanAttributes {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Wrap an async block in a tracing span. Attributes are flattened onto the
 * span for filtering/aggregation in Sentry Performance.
 *
 * @example
 * await trace('rag.embedding', { aiId, batchSize: 100 }, async () => {
 *   return service.embedBatch(texts);
 * });
 */
export function trace<T>(op: SpanOp, attributes: SpanAttributes, fn: () => Promise<T>): Promise<T> {
  return Sentry.startSpan(
    {
      op,
      name: op,
      attributes: stripUndefined(attributes),
    },
    fn
  );
}

/**
 * Synchronous variant — use when the wrapped block is CPU-bound and
 * synchronous (chunking, token counting, etc.).
 */
export function traceSync<T>(op: SpanOp, attributes: SpanAttributes, fn: () => T): T {
  return Sentry.startSpan(
    {
      op,
      name: op,
      attributes: stripUndefined(attributes),
    },
    fn
  );
}

/**
 * Attach extra attributes to the currently active span. Useful when the value
 * is only known mid-way (e.g. token counts, result size).
 */
export function setSpanAttributes(attributes: SpanAttributes): void {
  const span = Sentry.getActiveSpan();
  if (!span) return;
  for (const [key, value] of Object.entries(stripUndefined(attributes))) {
    span.setAttribute(key, value);
  }
}

function stripUndefined(attributes: SpanAttributes): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(attributes)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

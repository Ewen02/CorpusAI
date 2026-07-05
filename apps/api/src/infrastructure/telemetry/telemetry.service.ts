import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostHog } from 'posthog-node';

/** Propriétés d'un événement de génération RAG */
export interface RagGenerationEvent {
  aiId: string;
  conversationId: string;
  /** end-user identifié si disponible, sinon la conversation fait office d'identité */
  endUserId?: string | null;
  model?: string | null;
  confidence?: string | null;
  sourcesCount: number;
  latencyMs: number;
  tokensIn?: number | null;
  tokensOut?: number | null;
  /** Ventilation des latences du pipeline (condense/hyde/multiQuery/rerank/llm) */
  metrics?: Record<string, number | undefined>;
  /** Réponse servie depuis le cache sémantique (aucun appel LLM) */
  cacheHit?: boolean;
  /** La requête a échoué (message de fallback servi) */
  isError?: boolean;
}

/**
 * Télémétrie produit via PostHog — no-op complet sans POSTHOG_API_KEY.
 *
 * Émet des événements `$ai_generation` (conventions PostHog LLM analytics :
 * $ai_model, $ai_input_tokens, $ai_output_tokens, $ai_latency, $ai_trace_id)
 * enrichis des propriétés RAG (confiance, sources, ventilation des latences,
 * cache hit). Les captures sont best-effort : jamais d'erreur propagée,
 * jamais de blocage du chemin de réponse (batching côté client PostHog).
 */
@Injectable()
export class TelemetryService implements OnModuleDestroy {
  private readonly logger = new Logger(TelemetryService.name);
  private readonly client: PostHog | null = null;

  constructor(configService: ConfigService) {
    const apiKey = configService.get<string>('POSTHOG_API_KEY');
    if (apiKey) {
      this.client = new PostHog(apiKey, {
        host: configService.get<string>('POSTHOG_HOST') ?? 'https://eu.i.posthog.com',
        flushAt: 20,
        flushInterval: 10_000,
      });
      this.logger.log('PostHog telemetry enabled');
    } else {
      this.logger.log('POSTHOG_API_KEY not set — telemetry disabled');
    }
  }

  get isEnabled(): boolean {
    return this.client !== null;
  }

  /** Capture une génération RAG (réponse d'assistant, cache hit ou erreur). */
  captureRagGeneration(event: RagGenerationEvent): void {
    if (!this.client) return;

    try {
      this.client.capture({
        distinctId: event.endUserId ?? `conversation:${event.conversationId}`,
        event: '$ai_generation',
        properties: {
          // Conventions PostHog LLM analytics
          $ai_trace_id: event.conversationId,
          $ai_model: event.model ?? undefined,
          $ai_input_tokens: event.tokensIn ?? undefined,
          $ai_output_tokens: event.tokensOut ?? undefined,
          $ai_latency: event.latencyMs / 1000,
          $ai_is_error: event.isError ?? false,
          // Propriétés RAG CorpusAI
          ai_id: event.aiId,
          confidence: event.confidence ?? undefined,
          sources_count: event.sourcesCount,
          cache_hit: event.cacheHit ?? false,
          ...(event.metrics && {
            condense_ms: event.metrics.condenseMs,
            hyde_ms: event.metrics.hydeMs,
            multi_query_ms: event.metrics.multiQueryMs,
            rerank_ms: event.metrics.rerankMs,
            llm_ms: event.metrics.llmMs,
            search_ms: event.metrics.searchMs,
            embedding_ms: event.metrics.embeddingMs,
          }),
        },
      });
    } catch (error) {
      // Best-effort : la télémétrie ne doit jamais impacter le chemin de réponse
      this.logger.warn(`PostHog capture failed: ${error}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.shutdown().catch(() => {});
    }
  }
}

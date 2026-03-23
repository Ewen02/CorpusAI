export interface TestCase {
  question: string;
  expected_answer: string;
  document_id: string;
}

export interface EvalMetrics {
  faithfulness: number | null;
  answer_relevancy: number | null;
  context_recall: number | null;
}

export interface EvalResult {
  question: string;
  document_id: string;
  answer: string;
  sources: { documentSource: string; score: number; text: string }[];
  metrics: EvalMetrics;
  latencyMs: number;
  error?: string;
  metricError?: boolean;
}

export interface EvalSummary {
  faithfulness: number | null;
  answer_relevancy: number | null;
  context_recall: number | null;
  avgLatencyMs: number;
  validCounts: {
    faithfulness: number;
    answer_relevancy: number;
    context_recall: number;
    total: number;
  };
}

export interface EvalReport {
  runId: string;
  aiSlug: string;
  config: { apiUrl: string; model: string };
  summary: EvalSummary;
  results: EvalResult[];
}

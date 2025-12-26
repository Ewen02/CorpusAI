import type { AIData, SourceReference } from '@corpusai/types';

// ============================================
// BEHAVIOR RULES CONFIGURATION
// ============================================

export interface CorpusOnlyRule {
  enabled: boolean;
  fallbackMessage: string;
}

export interface SourceCitationRule {
  enabled: boolean;
  minConfidenceScore: number;
  maxSourcesPerResponse: number;
}

export interface UncertaintyDisclosureRule {
  enabled: boolean;
  lowConfidenceThreshold: number;
  uncertaintyPrefix: string;
}

export interface ScopeBoundariesRule {
  rejectOffTopic: boolean;
  rejectHarmful: boolean;
  rejectLegalAdvice: boolean;
  rejectMedicalAdvice: boolean;
}

export interface AIBehaviorRules {
  corpusOnly: CorpusOnlyRule;
  sourceCitation: SourceCitationRule;
  uncertaintyDisclosure: UncertaintyDisclosureRule;
  scopeBoundaries: ScopeBoundariesRule;
}

// ============================================
// DEFAULT BEHAVIOR RULES
// ============================================

export const DEFAULT_BEHAVIOR_RULES: AIBehaviorRules = {
  corpusOnly: {
    enabled: true,
    fallbackMessage:
      "I don't have this information in my knowledge base. Could you rephrase your question or contact the creator directly?",
  },
  sourceCitation: {
    enabled: true,
    minConfidenceScore: 0.7,
    maxSourcesPerResponse: 3,
  },
  uncertaintyDisclosure: {
    enabled: true,
    lowConfidenceThreshold: 0.5,
    uncertaintyPrefix: 'Based on the available documents, ',
  },
  scopeBoundaries: {
    rejectOffTopic: true,
    rejectHarmful: true,
    rejectLegalAdvice: true,
    rejectMedicalAdvice: true,
  },
};

// ============================================
// SYSTEM PROMPT BUILDER
// ============================================

interface SystemPromptContext {
  ai: Pick<AIData, 'name' | 'systemPrompt'>;
  creatorName: string;
  rules?: Partial<AIBehaviorRules>;
}

/**
 * Builds the system prompt for the AI based on configuration and rules
 */
export function buildSystemPrompt(context: SystemPromptContext): string {
  const { ai, creatorName, rules = {} } = context;
  const mergedRules = { ...DEFAULT_BEHAVIOR_RULES, ...rules };

  const coreRules = `
ABSOLUTE RULES - YOU MUST FOLLOW THESE:
1. You can ONLY answer based on the documents in your corpus
2. If you cannot find the information, say so honestly
3. Always cite your sources with the document name
4. NEVER make assumptions beyond what's in the corpus
5. NEVER provide advice that could be harmful
`.trim();

  const scopeRules = buildScopeRules(mergedRules.scopeBoundaries);

  const customPrompt = ai.systemPrompt ? `\n\nADDITIONAL INSTRUCTIONS FROM CREATOR:\n${ai.systemPrompt}` : '';

  return `You are the AI assistant for "${ai.name}", created by ${creatorName}.

${coreRules}

${scopeRules}
${customPrompt}

Remember: Your purpose is to faithfully transmit the knowledge from your corpus, not to generate new information. When in doubt, acknowledge uncertainty.`;
}

function buildScopeRules(boundaries: ScopeBoundariesRule): string {
  const rules: string[] = [];

  if (boundaries.rejectOffTopic) {
    rules.push('- Stay focused on topics covered in your corpus');
  }
  if (boundaries.rejectHarmful) {
    rules.push('- Refuse to provide harmful, dangerous, or unethical content');
  }
  if (boundaries.rejectLegalAdvice) {
    rules.push('- Do not provide specific legal advice - suggest consulting a professional');
  }
  if (boundaries.rejectMedicalAdvice) {
    rules.push('- Do not provide specific medical advice - suggest consulting a healthcare professional');
  }

  return rules.length > 0 ? `SCOPE BOUNDARIES:\n${rules.join('\n')}` : '';
}

// ============================================
// CONTEXT BUILDER FOR RAG
// ============================================

export interface ChunkContext {
  content: string;
  documentName: string;
  relevanceScore: number;
  chunkIndex?: number;
  pageNumber?: number;
}

/**
 * Builds the context section of the prompt from retrieved chunks
 */
export function buildContextSection(chunks: ChunkContext[]): string {
  if (chunks.length === 0) {
    return 'CONTEXT:\nNo relevant documents found for this query.';
  }

  const contextParts = chunks.map((chunk, index) => {
    const source = chunk.pageNumber
      ? `[${chunk.documentName}, page ${chunk.pageNumber}]`
      : `[${chunk.documentName}]`;

    return `--- Source ${index + 1} ${source} (relevance: ${(chunk.relevanceScore * 100).toFixed(0)}%) ---
${chunk.content}`;
  });

  return `CONTEXT FROM CORPUS:
${contextParts.join('\n\n')}

---
Use the above context to answer the user's question. Cite sources using [Document Name] format.`;
}

// ============================================
// RESPONSE VALIDATION
// ============================================

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Validates an AI response against the behavior rules
 */
export function validateResponse(
  response: string,
  sources: SourceReference[],
  rules: AIBehaviorRules = DEFAULT_BEHAVIOR_RULES
): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check source citation rule
  if (rules.sourceCitation.enabled) {
    if (sources.length === 0 && response.length > 100) {
      warnings.push('Response has no cited sources');
    }

    if (sources.length > rules.sourceCitation.maxSourcesPerResponse) {
      warnings.push(
        `Response cites ${sources.length} sources, max is ${rules.sourceCitation.maxSourcesPerResponse}`
      );
    }

    const lowConfidenceSources = sources.filter(
      (s) => s.relevanceScore < rules.sourceCitation.minConfidenceScore
    );
    if (lowConfidenceSources.length > 0) {
      warnings.push(
        `${lowConfidenceSources.length} source(s) have low confidence scores`
      );
    }
  }

  // Check for potential issues in response
  const problematicPatterns = [
    { pattern: /as an ai/i, message: 'Response mentions being an AI' },
    { pattern: /i don't have access/i, message: 'Response mentions access limitations' },
    { pattern: /my training/i, message: 'Response mentions training data' },
  ];

  for (const { pattern, message } of problematicPatterns) {
    if (pattern.test(response)) {
      warnings.push(message);
    }
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
  };
}

// ============================================
// CONFIDENCE LEVEL HELPERS
// ============================================

export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Determines the confidence level based on source scores
 */
export function determineConfidence(
  sources: SourceReference[],
  rules: AIBehaviorRules = DEFAULT_BEHAVIOR_RULES
): ConfidenceLevel {
  if (sources.length === 0) {
    return 'low';
  }

  const avgScore =
    sources.reduce((sum, s) => sum + s.relevanceScore, 0) / sources.length;

  if (avgScore >= rules.sourceCitation.minConfidenceScore) {
    return 'high';
  }

  if (avgScore >= rules.uncertaintyDisclosure.lowConfidenceThreshold) {
    return 'medium';
  }

  return 'low';
}

/**
 * Adds uncertainty prefix if confidence is low
 */
export function addUncertaintyPrefixIfNeeded(
  response: string,
  confidence: ConfidenceLevel,
  rules: AIBehaviorRules = DEFAULT_BEHAVIOR_RULES
): string {
  if (!rules.uncertaintyDisclosure.enabled) {
    return response;
  }

  if (confidence === 'low' || confidence === 'medium') {
    const prefix = rules.uncertaintyDisclosure.uncertaintyPrefix;
    // Only add if not already present
    if (!response.toLowerCase().startsWith(prefix.toLowerCase())) {
      return `${prefix}${response}`;
    }
  }

  return response;
}

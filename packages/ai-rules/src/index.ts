import type { SourceReference } from '@corpusai/types';

// ============================================
// BEHAVIOR RULES CONFIGURATION
// ============================================

export interface SourceCitationRule {
  enabled: boolean;
  /** Score minimum pour considérer une source fiable */
  highConfidenceThreshold: number;
  /** Score minimum pour considérer une source partielle */
  lowConfidenceThreshold: number;
  maxSourcesPerResponse: number;
}

export interface ScopeBoundariesRule {
  rejectHarmful: boolean;
  rejectLegalAdvice: boolean;
  rejectMedicalAdvice: boolean;
}

export interface AIBehaviorRules {
  sourceCitation: SourceCitationRule;
  scopeBoundaries: ScopeBoundariesRule;
}

// ============================================
// DEFAULT BEHAVIOR RULES
// ============================================

export const DEFAULT_BEHAVIOR_RULES: AIBehaviorRules = {
  sourceCitation: {
    enabled: true,
    highConfidenceThreshold: 0.7,
    lowConfidenceThreshold: 0.5,
    maxSourcesPerResponse: 5,
  },
  scopeBoundaries: {
    rejectHarmful: true,
    rejectLegalAdvice: true,
    rejectMedicalAdvice: true,
  },
};

// ============================================
// FORMAT RULES (source unique de vérité)
// ============================================

const FORMAT_RULES = `RÔLE :
Tu es un assistant généraliste avec accès à une base documentaire spécifique.

COMPORTEMENT :
- Si la question correspond à tes documents → base-toi dessus, cite tes sources [Source: fichier.md]
- Si la question est hors de tes documents → réponds avec tes connaissances générales en le précisant
- Si un de tes documents pourrait approfondir le sujet → mentionne-le naturellement
- Pour les conversations normales (salutations, etc.) → réponds naturellement

FORMAT :
- Adapte la longueur à la question : court pour les questions simples, détaillé pour l'architecture
- Style conversationnel, comme un collègue dev
- Tu peux utiliser des listes, du code ou des tableaux quand c'est le meilleur format
- Si le contexte contient des modèles de données ou des structures, reproduis-les fidèlement
- INTERDIT d'inventer du code : cite uniquement ce qui est dans le contexte
- Évite les formules scolaires : "Points clés à retenir", "Voici comment faire"
- Ton : direct, pragmatique, utile

INTERDITS :
- Ne demande JAMAIS de précision si tu as du contexte disponible. Utilise ce que tu as.
- Ne génère JAMAIS de structure générique (Objectif/Architecture/Composants) sans contenu réel du contexte
- Ne dis JAMAIS "Peux-tu préciser", "Plus de détails m'aideront", "Quel type d'exemples cherches-tu"
- Ne fais JAMAIS de réponse template vide. Si tu as du contexte, exploite-le directement.`;

export { FORMAT_RULES };

// ============================================
// SYSTEM PROMPT BUILDER
// ============================================

const DEFAULT_BASE_PROMPT = `Tu es un assistant technique pragmatique. Réponds comme un collègue dev qui explique naturellement.`;

interface SystemPromptOptions {
  /** Prompt système personnalisé (remplace le prompt de base, mais FORMAT_RULES est toujours ajouté) */
  customPrompt?: string;
}

/**
 * Construit le system prompt complet.
 * FORMAT_RULES est TOUJOURS inclus, même avec un prompt custom.
 */
export function buildSystemPrompt(options: SystemPromptOptions = {}): string {
  const base = options.customPrompt ?? DEFAULT_BASE_PROMPT;
  return `${base}\n\n${FORMAT_RULES}`;
}

// ============================================
// CONTEXT BUILDER FOR RAG
// ============================================

export interface ChunkContext {
  documentSource: string;
  text: string;
  score: number;
}

/**
 * Construit la section contexte à partir des chunks récupérés.
 */
export function buildContextSection(chunks: ChunkContext[], maxChars = 16_000): string {
  if (chunks.length === 0) {
    return '';
  }

  const parts: string[] = [];
  let totalLength = 0;

  for (const chunk of chunks) {
    const part = `[Source: ${chunk.documentSource}]\n${chunk.text}`;
    if (totalLength + part.length > maxChars && parts.length > 0) break;
    parts.push(part);
    totalLength += part.length;
  }

  return parts.join('\n\n---\n\n');
}

// ============================================
// CONFIDENCE LEVEL HELPERS
// ============================================

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Détermine le niveau de confiance basé sur les scores des sources.
 */
export function determineConfidence(
  sources: SourceReference[],
  rules: AIBehaviorRules = DEFAULT_BEHAVIOR_RULES
): ConfidenceLevel {
  if (sources.length === 0) {
    return 'LOW';
  }

  const avgScore =
    sources.reduce((sum, s) => sum + s.relevanceScore, 0) / sources.length;

  if (avgScore > rules.sourceCitation.highConfidenceThreshold) {
    return 'HIGH';
  }

  if (avgScore > rules.sourceCitation.lowConfidenceThreshold) {
    return 'MEDIUM';
  }

  return 'LOW';
}

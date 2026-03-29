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

export const FORMAT_RULES_FR =
  `Tu es un assistant conversationnel qui s'appuie sur une base documentaire.

CONVERSATIONS ET SUIVI

Réponds naturellement aux messages conversationnels (bonjour, merci,
au revoir, comment ça va, quel est ton rôle, etc.) sans chercher dans
les documents. Sois chaleureux et bref.

Pour les questions de suivi ("dis-m'en plus", "développe", "et ça ?",
"explique davantage", "en plus sur ce sujet"), utilise l'historique de
la conversation pour comprendre le sujet référencé et approfondis à
partir du contexte documentaire disponible. Ne traite pas ces messages
comme des requêtes isolées.

RÉPONSES BASÉES SUR LES DOCUMENTS

Réponds uniquement à partir du CONTEXTE fourni. Pas de connaissances
générales ajoutées, sauf si le créateur te le demande explicitement.

Cite tes sources inline au fil de la réponse — [Source: nom_du_fichier]
— juste après l'information concernée. Si plusieurs documents appuient
la même information, cite-les tous. Ne cite jamais un document absent
du CONTEXTE.

Si le contexte ne contient pas de quoi répondre, dis-le simplement
puis propose spontanément 2 ou 3 exemples concrets de questions
auxquelles tu peux répondre à partir des documents disponibles.
Format : une phrase courte de refus, puis "Je peux en revanche
t'aider sur :" suivi des exemples sous forme de liste courte.
Ne propose que des sujets réellement couverts par le contexte.

FORMAT ET TON

Réponds directement. Pas d'introduction type "Voici ce que j'ai trouvé",
pas de résumé en fin de réponse. Juste la réponse.

Adapte la longueur à la question : court pour les simples, structuré
pour les techniques. Listes et blocs de code bienvenus quand c'est utile.
Ne reproduis jamais du code absent du contexte.

Ton : direct, utile, naturel. Pas de formules scolaires.`.trim();

export const FORMAT_RULES_EN =
  `You are a conversational assistant powered by a document knowledge base.

CONVERSATIONS AND FOLLOW-UPS

Respond naturally to conversational messages (hello, thanks, goodbye,
how are you, what is your role, etc.) without searching the documents.
Be warm and brief.

For follow-up questions ("tell me more", "expand on that", "what about",
"explain further", "more on this topic"), use the conversation history
to understand the referenced subject and elaborate from the available
document context. Do not treat these messages as isolated queries.

DOCUMENT-BASED ANSWERS

Answer only from the provided CONTEXT. No general knowledge added,
unless the creator explicitly asks for it.

Cite your sources inline throughout the response — [Source: filename]
— right after the relevant information. If multiple documents support
the same information, cite them all. Never cite a document absent
from the CONTEXT.

If the context does not contain enough to answer, say so briefly,
then spontaneously suggest 2 or 3 concrete examples of questions
you can answer from the available documents.
Format: a short refusal sentence, then "I can however help you with:"
followed by a short list of examples.
Only suggest topics genuinely covered by the context.

FORMAT AND TONE

Answer directly. No introduction like "Here is what I found",
no summary at the end. Just the answer.

Adapt length to the question: brief for simple ones, structured
for technical ones. Lists and code blocks are welcome when useful.
Never reproduce code that is not explicitly in the context.

Tone: direct, helpful, natural. No academic phrasing.`.trim();

/** @deprecated Use getFormatRules() instead */
export const FORMAT_RULES = FORMAT_RULES_FR;

/**
 * Returns the format rules for the given language.
 * Defaults to French if language is not supported.
 */
export function getFormatRules(language?: string): string {
  if (language === 'en') return FORMAT_RULES_EN;
  return FORMAT_RULES_FR;
}

// ============================================
// SYSTEM PROMPT BUILDER
// ============================================

const DEFAULT_BASE_PROMPT_FR = `Tu es un assistant technique pragmatique. Réponds comme un collègue dev qui explique naturellement.`;
const DEFAULT_BASE_PROMPT_EN = `You are a pragmatic technical assistant. Answer like a dev colleague explaining things naturally.`;

function getDefaultBasePrompt(language?: string): string {
  if (language === 'en') return DEFAULT_BASE_PROMPT_EN;
  return DEFAULT_BASE_PROMPT_FR;
}

interface SystemPromptOptions {
  /** Prompt système personnalisé (remplace le prompt de base, mais les règles de format sont toujours ajoutées) */
  customPrompt?: string;
  /** Langue des règles de format : 'fr' (défaut) ou 'en' */
  language?: string;
}

/**
 * Construit le system prompt complet.
 * Les règles de format sont TOUJOURS incluses, même avec un prompt custom.
 */
export function buildSystemPrompt(options: SystemPromptOptions = {}): string {
  const rules = getFormatRules(options.language);
  if (options.customPrompt) {
    return `${options.customPrompt}\n\n---\n\n${rules}`;
  }
  return `${getDefaultBasePrompt(options.language)}\n\n${rules}`;
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

  const avgScore = sources.reduce((sum, s) => sum + s.relevanceScore, 0) / sources.length;

  if (avgScore > rules.sourceCitation.highConfidenceThreshold) {
    return 'HIGH';
  }

  if (avgScore > rules.sourceCitation.lowConfidenceThreshold) {
    return 'MEDIUM';
  }

  return 'LOW';
}

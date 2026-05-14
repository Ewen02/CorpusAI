import type { AICategory } from '@corpusai/types';

export const WIZARD_STORAGE_KEY = 'corpusai:wizard:ai-new';
export const WIZARD_STEPS = ['basics', 'documents', 'publish'] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];
export const TOTAL_STEPS = WIZARD_STEPS.length;

/**
 * Lightweight set of categories surfaced as templates in the wizard.
 * The DB enum has more values — those we don't list here fall back to OTHER.
 */
export const WIZARD_CATEGORIES = [
  'SUPPORT',
  'KNOWLEDGE_BASE',
  'EDUCATION',
  'INTERNAL_TOOL',
  'OTHER',
] as const;
export type WizardCategoryId = (typeof WIZARD_CATEGORIES)[number];

/**
 * Maps the wizard-facing category id to the API/DB AICategory enum.
 * KNOWLEDGE_BASE and INTERNAL_TOOL don't exist on the DB enum, so they map to
 * the closest supported value. The system prompt remains specific.
 */
export const CATEGORY_TO_API: Record<WizardCategoryId, AICategory> = {
  SUPPORT: 'SUPPORT',
  KNOWLEDGE_BASE: 'OTHER',
  EDUCATION: 'EDUCATION',
  INTERNAL_TOOL: 'OTHER',
  OTHER: 'OTHER',
};

export const CATEGORY_ICONS: Record<WizardCategoryId, string> = {
  SUPPORT: 'Headphones',
  KNOWLEDGE_BASE: 'BookOpen',
  EDUCATION: 'GraduationCap',
  INTERNAL_TOOL: 'Wrench',
  OTHER: 'Sparkles',
};

/**
 * Pre-filled system prompts per category. Available as a default when the user
 * picks a category in step 1 — they remain free to edit later in AI settings.
 */
export const SYSTEM_PROMPT_TEMPLATES: Record<WizardCategoryId, string> = {
  SUPPORT:
    'You are a customer support assistant. Answer user questions using only the provided documentation. If the answer is not in the documents, say so clearly and offer to escalate. Stay friendly, concise, and on-topic.',
  KNOWLEDGE_BASE:
    'You are a knowledge-base assistant. Retrieve precise information from the provided documents and cite the relevant sections. When information is missing, acknowledge it rather than guessing. Prefer short, well-structured answers.',
  EDUCATION:
    "You are a pedagogical assistant. Explain concepts progressively, adapt to the learner's level, and use the provided course materials as the source of truth. Encourage questions and provide concrete examples.",
  INTERNAL_TOOL:
    'You are an internal company assistant. Help teammates find information across the provided internal documents (policies, processes, runbooks). Be direct, action-oriented, and link to the source document when relevant.',
  OTHER:
    "You are a helpful assistant. Answer the user's questions based on the provided documents. Stay accurate, concise, and acknowledge when information is missing rather than making things up.",
};

/**
 * Three welcome-message suggestions per category, shown when the user clicks
 * "Try suggestions" in step 3. Pure constants — no API call.
 */
export const WELCOME_SUGGESTIONS: Record<WizardCategoryId, readonly [string, string, string]> = {
  SUPPORT: [
    'Hi! Ask me anything about our product — I will look it up in the docs for you.',
    'Welcome! Describe the issue you are running into and I will guide you.',
    'Hello! I am here to help with setup, billing, and troubleshooting questions.',
  ],
  KNOWLEDGE_BASE: [
    'Hi! Ask me anything — I will search the knowledge base and cite the sources.',
    'Welcome! What topic would you like to explore today?',
    'Hello! I can summarize, compare, or quote from our documentation.',
  ],
  EDUCATION: [
    'Welcome! Which concept would you like to dig into first?',
    'Hi! I can explain, give examples, or quiz you on the course material.',
    'Hello, ready to learn? Pick a topic or ask me a specific question.',
  ],
  INTERNAL_TOOL: [
    'Hi team! Ask me about our processes, tools, or runbooks.',
    'Welcome! What internal process do you need help with today?',
    'Hello! I can point you to the right document or summarize it for you.',
  ],
  OTHER: [
    'Hello! How can I help you today?',
    'Hi! Ask me anything based on the documents I was trained on.',
    'Welcome! What would you like to know?',
  ],
};

export const DEFAULT_PRIMARY_COLOR = '#3b82f6';
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_MAX_TOKENS = 1024;
export const DEFAULT_LANGUAGE: 'fr' | 'en' = 'fr';

export type AccessMode = 'OPEN' | 'PRIVATE';

export const SLUG_MAX_LENGTH = 40;

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH);
}

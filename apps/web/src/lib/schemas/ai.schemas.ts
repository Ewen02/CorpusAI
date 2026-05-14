import { z } from 'zod';

export const AI_NAME_MIN = 2;
export const AI_NAME_MAX = 60;
export const AI_DESCRIPTION_MAX = 280;
export const AI_SYSTEM_PROMPT_MAX = 4000;
export const AI_WELCOME_MESSAGE_MAX = 280;
export const AI_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

export const aiBaseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(AI_NAME_MIN, 'Name must be at least 2 characters')
    .max(AI_NAME_MAX, `Name must be at most ${AI_NAME_MAX} characters`),
  description: z
    .string()
    .trim()
    .max(AI_DESCRIPTION_MAX, `Description must be at most ${AI_DESCRIPTION_MAX} characters`)
    .optional()
    .default(''),
  systemPrompt: z
    .string()
    .max(AI_SYSTEM_PROMPT_MAX, `System prompt must be at most ${AI_SYSTEM_PROMPT_MAX} characters`)
    .optional()
    .default(''),
  welcomeMessage: z
    .string()
    .trim()
    .max(
      AI_WELCOME_MESSAGE_MAX,
      `Welcome message must be at most ${AI_WELCOME_MESSAGE_MAX} characters`
    )
    .optional()
    .default(''),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxTokens: z.number().int().min(64).max(8192).optional().default(1024),
  model: z.string().min(1).optional(),
});

export const aiCreateSchema = aiBaseSchema.extend({
  slug: z
    .string()
    .trim()
    .regex(
      AI_SLUG_PATTERN,
      'Slug must start with a letter or digit, use lowercase letters, digits or hyphens, max 40 characters'
    ),
});

export const aiUpdateSchema = aiBaseSchema.partial();

export type AICreateInput = z.input<typeof aiCreateSchema>;
export type AICreateOutput = z.output<typeof aiCreateSchema>;
export type AIUpdateInput = z.input<typeof aiUpdateSchema>;
export type AIUpdateOutput = z.output<typeof aiUpdateSchema>;

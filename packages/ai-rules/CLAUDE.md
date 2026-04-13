# @corpusai/ai-rules — Prompts et règles de comportement

## Rôle

Source de vérité unique pour les system prompts, règles de format et scoring de confiance. Utilisé par `@corpusai/corpus` et `apps/api`.

## Exports

| Export                                  | Description                                          |
| --------------------------------------- | ---------------------------------------------------- |
| `buildSystemPrompt(options)`            | System prompt complet (custom prompt + format rules) |
| `buildContextSection(chunks, maxChars)` | Formate chunks RAG en section CONTEXTE               |
| `determineConfidence(sources, rules)`   | HIGH/MEDIUM/LOW selon scores des sources             |
| `getFormatRules(language)`              | Règles de format FR ou EN                            |
| `DEFAULT_BEHAVIOR_RULES`                | Config citation et scope boundaries par défaut       |

## Conventions

- Format rules ALWAYS included in system prompt, even with `customPrompt`
- `language: 'en'` → EN rules, anything else → FR rules
- Use `getFormatRules()` (not deprecated `FORMAT_RULES`)
- No LLM-model-specific instructions here

## Checklist

- [ ] Tests for any change to `buildSystemPrompt` or `determineConfidence`
- [ ] Validate FR and EN behavior after rule changes
- [ ] No hardcoded LLM model names

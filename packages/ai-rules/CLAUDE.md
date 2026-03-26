# @corpusai/ai-rules — Prompts et règles de comportement

## Rôle

Source de vérité unique pour les system prompts, les règles de format et le scoring de confiance des réponses LLM. Utilisé par `@corpusai/corpus` (RAGPipelineImpl) et `apps/api`.

## Exports principaux

| Export                                  | Description                                                           |
| --------------------------------------- | --------------------------------------------------------------------- |
| `buildSystemPrompt(options)`            | Construit le system prompt complet (custom prompt + règles de format) |
| `buildContextSection(chunks, maxChars)` | Formate les chunks RAG en section CONTEXTE                            |
| `determineConfidence(sources, rules)`   | Détermine HIGH/MEDIUM/LOW selon les scores des sources                |
| `getFormatRules(language)`              | Retourne les règles de format FR ou EN                                |
| `DEFAULT_BEHAVIOR_RULES`                | Config de citation et scope boundaries par défaut                     |
| `FORMAT_RULES_FR` / `FORMAT_RULES_EN`   | Règles de format par langue                                           |

## Conventions

- Les règles de format sont TOUJOURS incluses dans le system prompt, même avec un `customPrompt`
- `language: 'en'` → règles EN, tout autre valeur → règles FR
- `FORMAT_RULES` (sans suffixe) est deprecated — utiliser `getFormatRules()`
- Pas d'instructions LLM-model-spécifiques ici (déléguer à la config pipeline)

## Modifier les prompts

Toute modification des règles de format (`FORMAT_RULES_FR`, `FORMAT_RULES_EN`) ou de `buildSystemPrompt` doit être validée manuellement en testant une conversation réelle avant de merger.

## Checklist qualité

- [ ] Tests ajoutés pour toute modification de `buildSystemPrompt` ou `determineConfidence`
- [ ] Valider le comportement FR et EN après modification des règles
- [ ] Ne pas hardcoder de noms de modèles LLM

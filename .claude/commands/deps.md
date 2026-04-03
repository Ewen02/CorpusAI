Audit rapide des dépendances du monorepo CorpusAI.

Steps:

1. Run en parallèle :
   - `pnpm audit` — vulnérabilités connues
   - `pnpm outdated` — packages avec mises à jour disponibles

2. Analyser les résultats et classer :

### Vulnérabilités

- 🔴 CRITICAL/HIGH : à corriger immédiatement
- 🟡 MODERATE : à planifier
- 🔵 LOW : informatif

### Mises à jour

- ⚠️ Major updates : breaking changes potentiels, lister les changelogs importants
- 📦 Minor/Patch : safe à mettre à jour

3. Vérifier les deps inutilisées (scan optionnel) :
   - Pour chaque package.json dans le monorepo
   - Lister les deps qui ne sont importées nulle part dans le code source

## Output format

```
## Deps Audit — YYYY-MM-DD

### Vulnérabilités
| Package | Severity | Fix available |
|---------|----------|---------------|

### Outdated (major)
| Package | Current | Latest | Breaking changes |
|---------|---------|--------|-----------------|

### Outdated (minor/patch)
N packages can be safely updated. Run: pnpm update

### Potentially unused
- package-name (in apps/web/package.json — not imported in src/)

### Verdict
HEALTHY / N issues to fix
```

Rules:

- Ne JAMAIS lancer `pnpm update` automatiquement — lister seulement
- Pour les major updates : vérifier le changelog avant de recommander
- Ignorer les false positives dans les deps inutilisées (peer deps, plugins, CLI tools)

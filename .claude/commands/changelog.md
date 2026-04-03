Génère un changelog depuis les conventional commits.

Usage : `/changelog [depuis]`

- Sans argument : depuis le dernier tag git (ou les 20 derniers commits si pas de tag)
- Avec argument : depuis le commit/tag/date spécifié (ex: `v1.0`, `2026-03-28`, `HEAD~30`)

Steps:

1. Déterminer la plage de commits :
   - `git tag --sort=-creatordate | head -1` pour trouver le dernier tag
   - Si pas de tag : utiliser les 20 derniers commits
   - Si argument fourni : utiliser comme borne inférieure

2. Extraire les commits : `git log <range> --format="%H %s"`

3. Parser les conventional commits et grouper par type :
   - 🚀 **Features** (feat)
   - 🐛 **Bug Fixes** (fix)
   - ♻️ **Refactoring** (refactor)
   - ⚡ **Performance** (perf)
   - 🧪 **Tests** (test)
   - 🔧 **Chores** (chore)
   - 📝 **Docs** (docs)

4. Pour chaque entrée : inclure le scope et la description

## Output format

```markdown
# Changelog — depuis <tag/date> (N commits)

## 🚀 Features

- **web**: description du commit
- **api**: description du commit

## 🐛 Bug Fixes

- **corpus**: description du commit

## ♻️ Refactoring

...

---

Généré le YYYY-MM-DD | N commits | scopes: web, api, corpus...
```

Rules:

- Ignorer les commits qui ne suivent pas le format conventional commits
- Grouper par type puis trier par scope alphabétiquement
- Ne pas inclure les hash de commit (bruit visuel)

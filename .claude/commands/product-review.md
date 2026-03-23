Audit produit automatique de CorpusAI — analyse les fonctionnalites implementees, la maturite, la roadmap et les gaps.

If `$ARGUMENTS` is provided, focus the audit on that aspect. Valid focus areas: `roadmap`, `gaps`, `features`, `tech-debt`, `maturity`. If no argument, run the full audit.

---

## Phase 1 — Scan automatique du projet

Gather project state by reading these files and running these commands **in parallel** (use Explore agents):

**Agent 1 — Project docs & schema:**
- Read `.claude/PROJECT_PLAN.md` (vision, roadmap, etat actuel)
- Read `.claude/TODO.md` (taches restantes)
- Read `packages/database/prisma/schema.prisma` (data model complet)
- Read `packages/corpus/src/rag/` (pipeline RAG, chunking, reranking)

**Agent 2 — Code surface (API + Web):**
- List all API modules: `ls apps/api/src/modules/`
- Read key controllers/services to understand what endpoints actually exist (not just module names)
- List all web pages: find all `page.tsx` files in `apps/web/src/app/`
- List all React Query hooks: find files in `apps/web/src/lib/queries/`
- List all UI components: find files in `packages/ui/src/` recursively

**Agent 3 — Activity & quality:**
- `git log --oneline -30` (recent activity)
- `git log --oneline --since="2 weeks ago" --format="%h %s"` (recent focus)
- Count test files in `apps/api/`, `apps/web/`, `packages/ui/`, `packages/corpus/`
- Search for TODO/FIXME/HACK comments in source code
- Check if CI/CD pipeline exists (`.github/workflows/`)

From this scan, build an internal map of:
- All implemented features (modules, pages, endpoints)
- Data model entities and their relationships
- Test coverage level
- Recent development focus areas
- What's declared in PROJECT_PLAN vs what actually exists in code

---

## Phase 2 — Analyse croisee

Croiser les donnees du scan pour produire l'analyse. **Pas de questions au user** — tout doit etre derive du code.

### 2.1 Maturite produit

Evaluer chaque critere sur cette grille en se basant **uniquement sur le code scanne** :

| Critere | MVP | Beta | Production |
|---------|-----|------|------------|
| Auth complete | email+OAuth | + 2FA + password reset | + SSO enterprise |
| CRUD core | create/read/update/delete | + bulk ops, search | + import/export |
| Pipeline RAG | basique fonctionnel | + reranking, hybrid search | + evaluation, A/B |
| Tests | < 30% | > 60% | > 80% + E2E |
| Monitoring | logs basiques | structured logging | + APM, alerting |
| Admin | aucun | dashboard basique | + moderation, analytics |
| API publique | aucune | endpoints documentes | + SDK, webhooks |
| Widget / Embed | basique | + personnalisation avancee | + SDK JS, analytics embed |
| Background jobs | queue basique | + retry, progress tracking | + dead-letter, monitoring |

Pour chaque critere, indiquer le niveau atteint et justifier avec des fichiers/modules concrets.

### 2.2 Inventaire fonctionnel

Lister exhaustivement :
- Chaque feature implementee, son statut reel (OK / Partiel / Stub)
- Les ecarts entre PROJECT_PLAN.md et le code (features declarees "100%" mais incompletes, ou features non documentees)
- Les pages/endpoints qui existent mais ne sont pas dans le plan

### 2.3 Analyse de la roadmap

Comparer la roadmap du PROJECT_PLAN.md avec l'etat du code :
- Quelles taches P0/P1/P2/P3 sont reellement terminees ?
- Quelles taches sont en cours ou partielles ?
- Y a-t-il des taches manquantes dans la roadmap qui devraient y etre ?
- Proposer une roadmap mise a jour et priorisee, organisee en sprints de 2 semaines

### 2.4 Gaps critiques

Identifier les manques qui bloquent un lancement :
- Features absentes pour un usage reel (ex: pages stub, flows incomplets)
- Securite (CORS, validation, injection, auth bypass potentiel)
- Resilience (error handling, retry, graceful degradation)
- UX (flows incomplets, pages stub, features non connectees)

### 2.5 Risques et dette technique

- Risques techniques (scaling, deps, securite)
- Dette technique accumulee (code quality, tests, monitoring)
- Dependances critiques (services externes, single points of failure)

---

## Phase 3 — Rapport structure

Presenter le rapport dans ce format exact :

```markdown
# Audit Produit CorpusAI — YYYY-MM-DD

## Maturite globale : [MVP | Beta avancee | Production-ready]

Score : X/8 criteres au niveau Beta ou superieur

---

## Inventaire fonctionnel

| Feature | Statut | Niveau | Notes |
|---------|--------|--------|-------|
| ... | OK / Partiel / Stub / Manquant | MVP/Beta/Prod | justification concrete |

---

## Maturite detaillee

| Critere | Niveau atteint | Justification |
|---------|---------------|---------------|
| Auth | MVP / Beta / Prod | fichiers/modules concrets |
| ... | ... | ... |

---

## Ecarts Plan vs Code

| Element | Declare dans le plan | Realite dans le code |
|---------|---------------------|---------------------|
| ... | "100%" | Partiel — il manque X |

---

## Roadmap recommandee

### Sprint 1 (2 semaines) — Focus: [theme]
| Tache | Effort | Impact | Justification |
|-------|--------|--------|---------------|
| ... | S/M/L | Critique/Haut/Moyen | pourquoi maintenant |

### Sprint 2 (2 semaines) — Focus: [theme]
| Tache | Effort | Impact | Justification |
|-------|--------|--------|---------------|
| ... | ... | ... | ... |

### Moyen terme (1-3 mois)
| Tache | Effort | Impact | Justification |
|-------|--------|--------|---------------|
| ... | ... | ... | ... |

### Long terme (3+ mois)
- ...

---

## Quick wins (effort S, impact haut)
1. ...
2. ...
3. ...

## Gaps critiques pour le lancement
| Gap | Severite | Ce qui manque concretement |
|-----|----------|---------------------------|
| ... | Bloquant/Haut/Moyen | ... |

## Risques
| Risque | Severite | Mitigation proposee |
|--------|----------|---------------------|
| ... | Critique/Haut/Moyen | ... |

## Recommandations strategiques
1. ...
2. ...
3. ...
```

---

## Regles

- **Zero questions au user** — tout est derive du scan du code
- Toujours baser l'analyse sur le code reel, pas sur ce que dit le PROJECT_PLAN.md
- Verifier les ecarts entre le plan et la realite du code
- Ne pas inventer des features qui n'existent pas dans le code
- Etre honnete et direct sur les gaps — le but est d'aider, pas de flatter
- Si `$ARGUMENTS` est fourni, le rapport complet est genere mais la section correspondante est detaillee en profondeur
- Le rapport doit etre actionnable : chaque recommandation doit etre concrete et faisable
- Citer les fichiers/modules concrets pour chaque constat

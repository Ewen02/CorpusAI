# CorpusAI - Plan du Projet

## Vision Produit

CorpusAI est une plateforme qui permet à des créateurs, formateurs, coachs ou experts de **transformer leur savoir en une IA experte vendable**, fidèle à leur pensée et strictement limitée à leur corpus de connaissances.

### Principes Fondamentaux

- **1 IA = 1 corpus** = 1 entité indépendante
- L'IA ne répond QUE sur la base des documents fournis
- Si l'information n'existe pas, l'IA le dit clairement
- Traçabilité : chaque réponse cite ses sources

---

## Architecture

### Structure Monorepo

```
corpusai/
├── apps/
│   ├── web/          # Next.js 15 - Interface créateurs & utilisateurs
│   ├── api/          # NestJS 11 - Backend principal
│   └── ai-worker/    # Service IA (embeddings, RAG)
├── packages/
│   ├── types/        # Types TypeScript partagés
│   ├── subscription/ # Logique abonnements & limites
│   ├── ai-rules/     # Règles comportementales IA
│   ├── database/     # Prisma schema & client
│   ├── corpus/       # Gestion documentaire & chunking
│   └── ui/           # Composants React (Atomic Design)
└── tooling/
    └── typescript-config/
```

### Stack Technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | Next.js 15, React 19, Tailwind, shadcn/ui |
| Backend | NestJS 11, Prisma, PostgreSQL |
| Vector DB | Qdrant (cloud) |
| Embeddings | OpenAI text-embedding-3-small |
| LLM | Claude / GPT-4 |
| Auth | Better Auth |
| Paiements | Stripe |

---

## Modèle de Domaine

```
Creator (1) ──── (N) AI (1) ──── (N) Document
                      │
                      └── (N) Conversation (1) ──── (N) Message
                      │
                      └── (N) Access ──── (N) EndUser
```

### Entités Principales

| Entité | Description |
|--------|-------------|
| **Creator** | Expert qui crée et possède des IA |
| **AI** | Instance IA avec son corpus |
| **Document** | Fichier source indexé |
| **Conversation** | Historique d'échanges |
| **Message** | Message avec sources citées |
| **EndUser** | Utilisateur final (compte cross-IA) |

---

## Plans d'Abonnement

| Plan | Prix | Max IA | Max Docs | Questions/jour |
|------|------|--------|----------|----------------|
| FREE | 0€ | 1 | 5 | 20 |
| CREATOR | 19€ | 3 | 50 | 500 |
| PRO | 49€ | 10 | 200 | Illimité |
| ENTERPRISE | 199€ | Illimité | Illimité | Illimité |

---

## Design System

### Palette (Dark Theme)

```css
--background: #0a0a0f     /* Base très sombre */
--primary: hsl(221 83% 53%)  /* Bleu froid */
--muted: hsl(240 5% 15%)     /* Éléments secondaires */
```

### Principes

- Base sombre pour réduire la fatigue oculaire
- Accent bleu froid, jamais agressif
- Typographie : Inter (texte), JetBrains Mono (code)

---

## Décisions Techniques

| Décision | Choix | Raison |
|----------|-------|--------|
| Vector DB | Qdrant Cloud | Performance, filtering natif |
| Comptes users | Cross-IA | Un compte accède à plusieurs IA |
| Widget | Embeddable | Intégration sur sites externes |
| Monétisation | Créateurs d'abord | Pas de paiement user pour l'instant |

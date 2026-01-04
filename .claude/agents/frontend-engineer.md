# Frontend Engineer - CorpusAI

## Spécialisation

Expert Next.js et React pour le développement de l'interface web de CorpusAI. Responsable de l'expérience utilisateur, des composants UI et de l'intégration frontend.

## Workspace

### Packages principaux
- `apps/web/` - Application Next.js 15
- `packages/ui/` - Bibliothèque de composants @corpusai/ui

### Technologies
- Next.js 15 (App Router)
- React 19
- TypeScript (strict mode)
- Tailwind CSS
- shadcn/ui (base des composants)
- class-variance-authority (variants)

## Standards de développement

### Structure des pages (App Router)
```
apps/web/src/app/
├── (auth)/           # Routes publiques (sign-in, sign-up)
├── (dashboard)/      # Routes protégées (layout avec sidebar)
│   ├── ais/          # Gestion des assistants IA
│   ├── settings/     # Paramètres utilisateur
│   └── page.tsx      # Dashboard principal
└── (marketing)/      # Landing pages
```

### Atomic Design (@corpusai/ui)
```
packages/ui/src/
├── atoms/       # Button, Input, Badge, Textarea, Switch...
├── molecules/   # Card, FormField, Tooltip...
├── organisms/   # ChatInterface, DocumentUploader, ConversationList...
└── templates/   # DashboardLayout, ChatLayout...
```

**Règles strictes** :
- Atoms : Aucune dépendance vers d'autres composants UI
- Molecules : Composés uniquement d'atoms
- Organisms : Peuvent utiliser atoms, molecules et autres organisms
- Toujours exporter depuis `packages/ui/src/index.ts`

### Conventions de code

```typescript
// Props avec interface dédiée
interface ButtonProps {
  variant?: "default" | "destructive" | "outline";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

// Variants avec cva()
const buttonVariants = cva("base-classes", {
  variants: {
    variant: { default: "...", destructive: "..." },
    size: { sm: "...", md: "...", lg: "..." },
  },
  defaultVariants: { variant: "default", size: "md" },
});
```

### État et data fetching
- `authClient.useSession()` pour l'authentification
- `fetch()` avec `credentials: "include"` pour les appels API
- États locaux avec `React.useState`
- Pas de state manager global (pour l'instant)

## Tâches courantes

### Créer une nouvelle page
1. Créer le fichier dans `apps/web/src/app/(dashboard)/[route]/page.tsx`
2. Utiliser `"use client"` si interactivité nécessaire
3. Importer les composants depuis `@corpusai/ui`
4. Gérer le loading state avec `<Skeleton />`

### Créer un nouveau composant UI
1. Identifier le niveau Atomic Design (atom/molecule/organism)
2. Créer dans `packages/ui/src/[level]/ComponentName.tsx`
3. Exporter dans `packages/ui/src/index.ts`
4. Utiliser `cva()` pour les variants si applicable

### Intégrer un appel API
```typescript
const [data, setData] = React.useState<DataType | null>(null);
const [isLoading, setIsLoading] = React.useState(true);

React.useEffect(() => {
  const fetchData = async () => {
    try {
      const res = await fetch("http://localhost:3001/endpoint", {
        credentials: "include",
      });
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  fetchData();
}, []);
```

## Points d'intégration

### Avec Backend Engineer
- Endpoints API REST (`http://localhost:3001`)
- Types partagés depuis `@corpusai/types`
- Authentification via cookies Better Auth

### Avec AI/RAG Engineer
- Interface de chat (`ChatInterface` organism)
- Upload de documents (`DocumentUploader` organism)
- Affichage des sources (`SourceCitation` organism)

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `apps/web/src/lib/auth-client.ts` | Client Better Auth |
| `apps/web/src/app/(dashboard)/layout.tsx` | Layout dashboard avec sidebar |
| `packages/ui/src/index.ts` | Exports de tous les composants |
| `packages/ui/tailwind.config.ts` | Configuration Tailwind partagée |

## Checklist qualité

- [ ] TypeScript strict, pas de `any`
- [ ] Composants responsive (mobile-first)
- [ ] Loading states avec Skeleton
- [ ] Textes en français avec accents corrects
- [ ] Imports depuis `@corpusai/ui` (pas de chemins relatifs vers packages/ui)

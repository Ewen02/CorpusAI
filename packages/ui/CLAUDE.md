# @corpusai/ui — Bibliotheque de composants React

## Atomic Design (STRICTEMENT APPLIQUE)

### atoms/ — Elements indivisibles

Aucune dependance vers d'autres composants UI. Seulement React, Tailwind, cva, Radix.

Actuels : avatar, badge, button, icons, input, label, select, separator, skeleton, switch, tabs, textarea

### molecules/ — Composes d'atoms UNIQUEMENT

Actuels : card, chart-tooltip, explore-ai-card, markdown-renderer, stat-card, tooltip, trend-badge

### organisms/ — Peuvent utiliser atoms + molecules + autres organisms

Actuels : chat-interface, conversation-list, document-uploader, notification-bar, source-citation

### templates/ — Layouts de pages (structure sans donnees reelles)

Actuels : auth-layout, dashboard-layout

## Regles

1. Identifier le bon niveau Atomic Design AVANT de creer un composant
2. Atoms NE DOIVENT PAS importer de molecules/organisms/templates
3. Molecules NE DOIVENT importer QUE des atoms
4. Chaque composant DOIT etre exporte depuis `src/index.ts`
5. Props types avec `interface ComponentNameProps`
6. Variants via `cva()` de class-variance-authority
7. Utiliser `cn()` depuis `src/lib/utils.ts` pour merger les classes

## Pattern composant

```typescript
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const componentVariants = cva("base-classes", {
  variants: {
    variant: { default: "...", destructive: "..." },
    size: { sm: "...", md: "...", lg: "..." },
  },
  defaultVariants: { variant: "default", size: "md" },
});

export interface ComponentNameProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof componentVariants> {}

export function ComponentName({ variant, size, className, ...props }: ComponentNameProps) {
  return <div className={cn(componentVariants({ variant, size }), className)} {...props} />;
}
```

## Exports (src/index.ts)

Toujours exporter : le composant, son type Props, et la fonction de variants si elle existe.

## References

- Pattern atom : `src/atoms/button.tsx`
- Pattern molecule : `src/molecules/stat-card.tsx`
- Pattern organism : `src/organisms/chat-interface.tsx`

## Fichiers cles

| Fichier                              | Role                                                      |
| ------------------------------------ | --------------------------------------------------------- |
| `src/index.ts`                       | TOUS les exports publics (composants, types, utilitaires) |
| `src/lib/utils.ts`                   | Utilitaire cn()                                           |
| `src/styles.css`                     | Styles Tailwind de base                                   |
| `src/organisms/notification-bar.tsx` | Barre de notification contextuelle (info/warning/error)   |
| `src/molecules/explore-ai-card.tsx`  | Carte pour la page de découverte des AIs publics          |
| `src/molecules/stat-card.tsx`        | Carte stat avec icône, valeur, tendance                   |
| `src/molecules/trend-badge.tsx`      | Badge +X% / -X% avec couleur dynamique                    |
| `src/molecules/chart-tooltip.tsx`    | Tooltip personnalisé pour graphiques Recharts             |

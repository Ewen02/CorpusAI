# @corpusai/ui — React Component Library

## Atomic Design (strict)

- **atoms/** : No dependency on other UI components. Only React, Tailwind, cva, Radix.
  Current: avatar, badge, button, icon-box, icons, input, label, select, separator, skeleton, switch, tabs, textarea
- **molecules/** : Compose atoms ONLY.
  Current: analytics-card, card, chart-tooltip, explore-ai-card, markdown-renderer, section-header, stat-card, tooltip, trend-badge
- **organisms/** : Can use atoms + molecules + other organisms.
  Current: chat-interface, conversation-list, document-uploader, notification-bar, source-citation
- **templates/** : Page layouts (structure without real data).
  Current: auth-layout, dashboard-layout

## Rules

1. Atoms MUST NOT import molecules/organisms/templates
2. Molecules MUST only import atoms
3. Every component MUST be exported from `src/index.ts`
4. Props types: `interface ComponentNameProps`
5. Variants via `cva()`, merge with `cn()` from `src/lib/utils.ts`

## Component Pattern

```typescript
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const variants = cva("base-classes", {
  variants: { variant: { default: "...", destructive: "..." }, size: { sm: "...", md: "...", lg: "..." } },
  defaultVariants: { variant: "default", size: "md" },
});

export interface ComponentNameProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof variants> {}

export function ComponentName({ variant, size, className, ...props }: ComponentNameProps) {
  return <div className={cn(variants({ variant, size }), className)} {...props} />;
}
```

Export: component, Props type, and variants function. References: `src/atoms/button.tsx`, `src/molecules/stat-card.tsx`, `src/organisms/chat-interface.tsx`.

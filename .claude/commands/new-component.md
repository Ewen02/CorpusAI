Create a new UI component named `$ARGUMENTS` in the `@corpusai/ui` package.

Steps:

1. Determine the Atomic Design level:
   - **atom**: No UI dependencies (Button, Input, Badge...)
   - **molecule**: Composed of atoms only (Card, StatCard, Tooltip...)
   - **organism**: Uses atoms + molecules (ChatInterface, DocumentUploader...)
   - **template**: Page layout structure
2. Create `packages/ui/src/{level}/{component-name}.tsx`
3. Use the `cva()` + `cn()` pattern if variants are needed
4. Define a typed props interface: `interface {ComponentName}Props`
5. Export the component and its props from `packages/ui/src/index.ts`
6. Follow dependency rules strictly: atoms have no UI deps, molecules use only atoms

Reference patterns:
- Atom: `packages/ui/src/atoms/button.tsx`
- Molecule: `packages/ui/src/molecules/stat-card.tsx`
- Organism: `packages/ui/src/organisms/chat-interface.tsx`

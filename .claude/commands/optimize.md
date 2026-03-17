Run a deep optimization audit on the CorpusAI project: refactoring, clean code, performance, and best practices.

If a specific domain is given as argument ($ARGUMENTS), focus only on that domain. Valid domains: `frontend`, `backend`, `database`, `rag`, `bundle`, `dx`. If no argument is given, audit all 6 domains.

**Difference with `/audit`** : `/audit` checks patterns (PASS/WARN/FAIL). `/optimize` finds concrete refactoring opportunities and proposes code changes.

---

## How to run

1. Launch up to 3 Explore agents in parallel to scan the codebase for the relevant domain(s)
2. For each finding, provide:
   - **What**: the current code (file:line)
   - **Why**: why it should change (performance, readability, maintainability, best practice)
   - **How**: the concrete refactored code or approach
   - **Impact**: S (cosmetic) / M (measurable improvement) / L (critical for prod)
3. Output the structured report (format below)
4. End with a prioritized action plan, grouped by effort

---

## Domain 1: Frontend Performance (`frontend`)

Scan `apps/web/src/` and `packages/ui/src/`.

### Checks:
- **Dead code**: unused imports, unused components, unreachable branches
- **Unnecessary `"use client"`**: components that could be Server Components (no useState, useEffect, event handlers)
- **Missing lazy loading**: heavy components (charts, markdown renderer, code highlighter) not wrapped in `next/dynamic` or `React.lazy`
- **Redundant re-renders**: missing `React.memo`, unstable callback references, objects/arrays created in render
- **Prop drilling**: data passed through 3+ levels that should use context or composition
- **Duplicate logic**: similar code in multiple components that should be extracted into a hook or utility
- **Hardcoded values**: magic numbers, hardcoded strings that should be constants
- **Accessibility gaps**: missing aria labels, keyboard navigation, focus management
- **Image optimization**: images not using `next/image`, missing width/height, no priority on LCP
- **CSS bloat**: duplicate Tailwind classes, unused utility patterns, overly specific selectors

---

## Domain 2: Backend Clean Code (`backend`)

Scan `apps/api/src/`.

### Checks:
- **God services**: services with 300+ lines that should be split (single responsibility)
- **Missing error handling**: async operations without try/catch, fire-and-forget promises
- **Inconsistent patterns**: some modules follow patterns others don't (e.g., ownership checks in controller vs service)
- **Dead code**: unused methods, unreachable conditions, stale imports
- **Missing DTOs**: endpoints accepting raw objects instead of validated DTOs
- **Hardcoded config**: values that should come from ConfigService or env vars
- **N+1 queries**: loops with individual DB queries instead of batch operations
- **Missing select**: Prisma queries fetching all fields when only a few are needed
- **Transaction gaps**: multi-step writes not wrapped in `$transaction`
- **Logging inconsistencies**: some operations logged, similar ones not; inconsistent log levels
- **Code duplication**: similar logic across services (e.g., ownership verification patterns)

---

## Domain 3: Database & Queries (`database`)

Scan `packages/database/prisma/schema.prisma` and all `*.service.ts` files using Prisma.

### Checks:
- **Missing indexes**: columns used in WHERE, ORDER BY, or JOIN without `@@index`
- **Unnecessary includes**: `include` fetching relations that aren't used
- **Raw SQL opportunities**: complex aggregations done in JS that could be done in SQL
- **Schema inconsistencies**: nullable fields that shouldn't be, missing defaults, unused fields
- **Denormalization issues**: counters out of sync, computed fields that could be derived
- **Cascade risks**: cascade deletes that could orphan data or cause unexpected mass deletion
- **Connection pooling**: multiple Prisma instances, missing connection limits
- **Migration readiness**: schema changes that would be destructive in production

---

## Domain 4: RAG Pipeline (`rag`)

Scan `packages/corpus/src/`, `packages/ai-rules/src/`, `apps/ai-worker/src/`.

### Checks:
- **Chunking efficiency**: chunk sizes outside 400-1000 token sweet spot, naive splitting
- **Embedding waste**: redundant embeddings, missing cache hits, batches too small or too large
- **Reranking overhead**: reranking on every query vs selective, threshold tuning
- **Prompt engineering**: system prompts with redundant instructions, missing few-shot examples
- **Memory leaks**: large arrays/buffers not released after processing
- **Error recovery**: failed embeddings not retried, partial index states
- **Token waste**: context that exceeds model window, unnecessary conversation history

---

## Domain 5: Bundle & Dependencies (`bundle`)

Scan `package.json` files across the monorepo and build output.

### Checks:
- **Dependency bloat**: packages in `dependencies` that should be `devDependencies`
- **Duplicate packages**: same library at different versions across workspaces
- **Heavy imports**: importing entire libraries when only a few functions are used (e.g., `import lodash` vs `import lodash/get`)
- **Missing tree-shaking**: barrel exports that prevent dead code elimination
- **Outdated packages**: major version updates available with breaking changes
- **Unused dependencies**: packages in package.json not imported anywhere
- **Build output size**: unnecessarily large compiled bundles
- **Peer dependency conflicts**: version mismatches between workspaces

---

## Domain 6: Developer Experience (`dx`)

Scan root config files, scripts, CI/CD, tooling.

### Checks:
- **Script inconsistencies**: some packages have `test` script, others don't; naming conventions vary
- **TypeScript config drift**: different strict settings across packages
- **Missing pre-commit checks**: lint/format/typecheck not enforced consistently
- **Slow feedback loops**: builds that could be cached, tests that could run in parallel
- **Documentation gaps**: complex modules without README or CLAUDE.md
- **Inconsistent exports**: some packages use barrel exports, others export directly
- **Dev server ergonomics**: missing hot reload, slow startup, env var confusion

---

## Report Format

Output the report in this exact structure:

```
# Optimize CorpusAI — YYYY-MM-DD

## Summary: X findings | L critical | M high | S cosmetic

---

### CRITICAL (Impact L — fix for production readiness)

#### [DOMAIN] Title
**File:** `path/to/file.ts:42`
**Current:**
```code
// problematic code
```
**Proposed:**
```code
// refactored code
```
**Why:** explanation
**Effort:** S/M/L

---

### HIGH (Impact M — measurable improvement)
...

### COSMETIC (Impact S — code cleanliness)
...

---

## Action Plan

### Quick wins (< 1h each)
1. ...

### Medium effort (1-4h)
1. ...

### Large refactors (4h+)
1. ...

## Metrics to track
- ...
```

---

## Rules

- Always base findings on actual code, not assumptions
- Show the specific file and line number for every finding
- Propose concrete code — not just "consider refactoring"
- Prioritize by production impact, not code aesthetics
- Don't flag things already covered by the project's CLAUDE.md rules unless they're violated
- If a finding affects multiple files, list all of them
- Group related findings together (e.g., "all services missing select" = one finding, not 10)

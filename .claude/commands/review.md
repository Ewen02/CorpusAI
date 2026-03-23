Review the current changes (staged + unstaged diff) for quality issues before committing.

If `$ARGUMENTS` is provided, it narrows the review scope (e.g., "security", "performance", "types").

---

## Steps

1. Run in parallel:
   - `git diff HEAD` — all changes since last commit (staged + unstaged)
   - `git diff --cached --stat` — summary of staged files
   - `git status` — current state

2. If the diff is empty, report "No changes to review" and stop.

3. For each modified file, analyze only the changed lines (+/-) for:

### Security

- Hardcoded secrets, API keys, passwords in code
- `eval()`, `exec()`, unescaped user input (XSS/injection risk)
- Missing auth checks on new endpoints
- Sensitive data exposed in API responses or logs

### TypeScript Quality

- Use of `any` without justification
- Missing type annotations on public functions
- Non-null assertions (`!`) that could hide bugs
- Incorrect or missing error types

### Patterns & Conventions

- Does the code follow existing patterns in the same file/module?
- Missing `select` on Prisma queries (fetching unnecessary fields)
- Missing `@ApiOperation`/`@ApiResponse` on new NestJS endpoints
- Missing `class-validator` decorators on new DTOs
- `"use client"` added unnecessarily to a Server Component
- Direct relative imports from `@corpusai/ui` instead of the package

### Tests

- Are new business logic functions tested?
- Are new API endpoints covered?
- Are edge cases (empty arrays, null values, errors) handled?

### Performance

- N+1 queries (Prisma findMany inside a loop)
- Missing `await` on async calls
- Heavy operations on the main thread (should be BullMQ job)
- Embedding calls outside batch (always batch ≤100)

---

## Output format

```
## Review: <branch or "current changes">

### Summary
<1-2 sentences on what the change does>

### Issues Found
- 🔴 CRITICAL: <issue> — <file>:<line>
- 🟡 WARNING: <issue> — <file>:<line>
- 🔵 SUGGESTION: <issue> — <file>:<line>

### Looks Good
- <things done correctly worth noting>

### Verdict
READY TO COMMIT / NEEDS FIXES
```

Use 🔴 for security/correctness issues that must be fixed.
Use 🟡 for pattern violations or missing tests.
Use 🔵 for optional improvements.

If no issues are found, output "✅ LGTM — ready to commit."

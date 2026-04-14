import config from '@corpusai/eslint-config/nestjs';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...config,
  {
    files: ['src/modules/**/*.ts'],
    ignores: ['src/modules/**/*.test.ts', 'src/modules/**/*.spec.ts'],
    rules: {
      // Enforce barrel-only imports across modules: importing internal files
      // from another module (e.g. `../auth/auth.guard`) is forbidden — use `../auth` instead.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // Match sibling-module internal files: `../auth/auth.guard`, `../rag/rag.service`.
              // The single `../` prefix ensures we only target sibling modules.
              // Imports to `../../infrastructure/*`, `../../shared/*`, `../../lib/*` are allowed
              // (those barrels are the canonical entry points).
              regex: '^\\.\\./[^./][^/]*/(?!index).+$',
              message:
                'Cross-module imports must go through the barrel export (index.ts). Import from `../<module>` instead of `../<module>/<file>`.',
            },
          ],
        },
      ],
    },
  },
];

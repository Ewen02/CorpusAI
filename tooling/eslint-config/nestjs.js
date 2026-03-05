import base from './base.js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...base,
  {
    rules: {
      // NestJS uses empty classes and decorators frequently
      '@typescript-eslint/no-extraneous-class': 'off',
      // Allow constructor DI with no body
      'no-useless-constructor': 'off',
      '@typescript-eslint/no-useless-constructor': 'off',
    },
  },
];

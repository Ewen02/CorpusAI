import config from '@corpusai/eslint-config/base';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...config,
  {
    // Experiment scripts are CLI tools where console output is the UI.
    files: ['src/experiments/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];

import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

const clientFiles = ['client/src/**/*.{js,jsx}'];

export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**'] },

  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // Node: server, shared, scripts and tool configuration.
  {
    files: [
      'server/**/*.js',
      'shared/**/*.js',
      'scripts/**/*.js',
      '*.config.js',
      'client/vite.config.js',
    ],
    languageOptions: { globals: globals.node },
  },

  // Browser: React client.
  { files: clientFiles, ...react.configs.flat.recommended },
  { files: clientFiles, ...react.configs.flat['jsx-runtime'] },
  { files: clientFiles, ...reactHooks.configs.flat.recommended },
  { files: clientFiles, ...jsxA11y.flatConfigs.recommended },
  {
    files: clientFiles,
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      'react/prop-types': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // Formatting is Prettier's job.
  prettier,
];

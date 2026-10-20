/**
 * ESLint flat config for the whole monorepo. Formatting is Prettier's job
 * (eslint-config-prettier turns off style rules that would conflict).
 * ESLint 10 tracks JSX references natively, so no React plugin is needed for unused-vars.
 */
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';
import prettier from 'eslint-config-prettier';

const jsx = { parserOptions: { ecmaFeatures: { jsx: true } } };

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/coverage/**',
      'playwright-report/**',
      'test-results/**',
      'packages/shared/src/generated/**',
    ],
  },
  js.configs.recommended,
  {
    rules: {
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none', ignoreRestSiblings: true },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
    },
  },
  // Node: API, shared package, scripts, tests, config files
  {
    files: [
      'apps/api/**/*.js',
      'packages/shared/**/*.{js,mjs}',
      'e2e/**/*.js',
      '*.config.{js,mjs}',
      'eslint.config.js',
    ],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['apps/api/src/scripts/**/*.js', 'packages/shared/scripts/**/*.mjs', 'e2e/**/*.js'],
    rules: { 'no-console': 'off' },
  },
  // React (web + admin + shared UI)
  {
    files: ['apps/web/**/*.{js,jsx}', 'apps/admin/**/*.{js,jsx}', 'packages/ui/**/*.{js,jsx}'],
    languageOptions: { ...jsx, globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['apps/web/**/*.{js,jsx}'],
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      // App Router: fonts in the root layout load on every page (the rule targets pages/_document).
      '@next/next/no-page-custom-font': 'off',
    },
    settings: { next: { rootDir: 'apps/web' } },
  },
  prettier,
];

import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import eslintConfigPrettier from 'eslint-config-prettier'

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/vite.config.js',
      '**/vite.config.d.ts',
      '**/vitest.config.js',
      '**/vitest.config.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Allow warn/error (existing pattern: auth-context.tsx, ErrorBoundary.tsx) —
      // only a stray console.log/debug left over from debugging is the real risk.
      'no-console': ['error', { allow: ['warn', 'error'] }],
      // Match tsc's noUnusedParameters convention (already used repo-wide for
      // intentionally-unused params, e.g. Express's required 4-arg error handlers).
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['server/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    // CLI seed script, not request-handling code — plain stdout progress output is expected.
    files: ['server/prisma/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    // Only the classic hooks-correctness rules, not eslint-plugin-react-hooks@7's
    // bundled React Compiler rule set (out of scope for this repo, which doesn't
    // use the compiler) — v7 is required purely for its ESLint 10 peer support.
    files: ['client/src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['*.{js,mjs,ts}', 'client/*.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
  eslintConfigPrettier
)

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // ── Node.js packages and Edge API ──────────────────────────
  {
    files: ['packages/*/src/**/*.ts', 'apps/edge-api/src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // ── React / Edge Web (browser) ─────────────────────────────
  {
    files: ['apps/edge-web/src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // ── Global ignores ─────────────────────────────────────────
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', '**/modules_data/**'],
  },
);

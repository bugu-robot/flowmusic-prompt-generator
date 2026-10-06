import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: { globals: { document: 'readonly', window: 'readonly', navigator: 'readonly', localStorage: 'readonly', URL: 'readonly', URLSearchParams: 'readonly', Blob: 'readonly', FileReader: 'readonly', HTMLElement: 'readonly', HTMLInputElement: 'readonly', HTMLSelectElement: 'readonly', HTMLTextAreaElement: 'readonly', Event: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', console: 'readonly', importScripts: 'readonly', caches: 'readonly', self: 'readonly', clients: 'readonly', fetch: 'readonly', Response: 'readonly', Request: 'readonly', location: 'readonly', crypto: 'readonly', btoa: 'readonly', atob: 'readonly' } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['public/sw.js'],
    languageOptions: {
      globals: {
        self: 'readonly',
        caches: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
      },
    },
  },
);

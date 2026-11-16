// Flat config. The order matters: eslint-config-prettier must come last so it
// can switch off the stylistic rules that Prettier already owns.
import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import svelteParser from 'svelte-eslint-parser';

export default defineConfig(
  { ignores: ['dist/**', '.astro/**', 'node_modules/**', 'design/mockups/**', '.wrangler/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs['flat/recommended'],
  ...astro.configs['flat/jsx-a11y-recommended'],
  ...svelte.configs['flat/recommended'],

  // Svelte single-file components need the Svelte parser for the markup and
  // the TypeScript parser for the contents of <script lang="ts">.
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.svelte'] },
    },
  },

  // Config and build files run in Node, not the browser.
  {
    files: ['*.config.{js,mjs,ts}', 'scripts/**/*.{js,mjs,ts}'],
    languageOptions: { globals: globals.node },
  },

  // Browser globals for anything that ships to the client.
  {
    files: ['src/**/*.{ts,svelte,astro}'],
    languageOptions: { globals: globals.browser },
  },

  // TypeScript's own checker already catches undefined identifiers, and
  // no-undef misreports type-only names, so it is off for TypeScript.
  {
    files: ['**/*.{ts,tsx,svelte,astro}'],
    rules: { 'no-undef': 'off' },
  },

  // A leading underscore marks a binding that is deliberately unused.
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },

  prettier,
);

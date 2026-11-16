import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Unit tests cover the pure modules under src/lib, which never touch Astro,
// Svelte or the DOM. See the plan's Verification section for what's in scope.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    // Phase 1 adds the first suites; until then CI shouldn't fail on an empty run.
    passWithNoTests: true,
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
    },
  },
});

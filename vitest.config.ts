import { defineConfig } from 'vitest/config';

// Aggregate root tooling tests (node) with each workspace package's own Vitest
// project (which sets its own environment, e.g. jsdom for @repo/ui components).
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'root',
          environment: 'node',
          include: ['tests/**/*.test.ts'],
        },
      },
      'packages/*/vitest.config.ts',
      'apps/*/vitest.config.ts',
    ],
  },
});

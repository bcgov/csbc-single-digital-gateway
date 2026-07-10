import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'emails',
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
  },
});

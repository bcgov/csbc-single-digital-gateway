import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'notification-database',
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
  },
});

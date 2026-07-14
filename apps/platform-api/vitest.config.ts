import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // SWC emits the decorator metadata NestJS DI relies on (esbuild does not).
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    name: 'platform-api',
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', 'src/swagger.ts'],
      reportOnFailure: true,
    },
  },
});

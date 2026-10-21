import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { APP_OPTIONS } from '../../src/app-options';

// 123 B1.
describe('citizen-portal-api app options (123 B1)', () => {
  describe('shutdown', () => {
    it('creates the app with forceCloseConnections so open streams never block app.close()', () => {
      expect(APP_OPTIONS.forceCloseConnections).toBe(true);
      expect(APP_OPTIONS.bufferLogs).toBe(true);
    });

    it('main.ts creates the app with these options', () => {
      const main = readFileSync(resolve(__dirname, '../../src/main.ts'), 'utf8');
      expect(main).toMatch(/NestFactory\.create<NestExpressApplication>\(AppModule, APP_OPTIONS\)/);
      expect(main).toContain("from './app-options'");
    });
  });
});

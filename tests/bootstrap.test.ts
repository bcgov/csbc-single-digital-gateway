import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

interface RootPackage {
  private?: boolean;
  workspaces?: string[];
  scripts?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const rootPkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'),
) as RootPackage;

describe('monorepo bootstrap', () => {
  it('root package is private', () => {
    expect(rootPkg.private).toBe(true);
  });

  it('declares apps/* and packages/* workspaces', () => {
    expect(rootPkg.workspaces).toContain('apps/*');
    expect(rootPkg.workspaces).toContain('packages/*');
  });

  it('exposes the core toolchain scripts', () => {
    for (const script of ['lint', 'format', 'typecheck', 'test', 'build']) {
      expect(rootPkg.scripts).toHaveProperty(script);
    }
  });

  it('pins the expected dev toolchain', () => {
    for (const dep of ['turbo', 'prettier', 'oxlint', 'vitest', 'lefthook', 'typescript']) {
      expect(rootPkg.devDependencies).toHaveProperty(dep);
    }
  });
});

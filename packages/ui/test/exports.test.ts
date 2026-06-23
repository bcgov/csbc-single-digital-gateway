import { describe, expect, it } from 'vitest';
import pkg from '../package.json';

const exportsMap = pkg.exports as Record<string, unknown>;

describe('@repo/ui exports map', () => {
  it('gives every component a dev (source) + prod (dist) condition', () => {
    for (const [key, value] of Object.entries(exportsMap)) {
      if (key === './styles.css') continue;
      expect(value, key).toMatchObject({
        types: expect.stringContaining('./dist/'),
        development: expect.stringContaining('./src/'),
        import: expect.stringContaining('./dist/'),
        require: expect.stringContaining('./dist/'),
      });
    }
  });

  it('serves styles.css from source in dev and dist in prod', () => {
    expect(exportsMap['./styles.css']).toEqual({
      development: './src/styles.css',
      default: './dist/styles.css',
    });
  });
});

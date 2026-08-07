import { describe, expect, it } from 'vitest';
import pkg from '../package.json';

const exportsMap = pkg.exports as Record<string, unknown>;

describe('@repo/ui exports map', () => {
  it('gives every component a dev (source) + prod (dist) condition', () => {
    for (const [key, value] of Object.entries(exportsMap)) {
      // Raw asset exports (styles.css, brand *.svg, the generated a11y catalog JSON) carry a
      // development/default shape, not the module conditions — they're files, not modules.
      if (/\.(css|svg|json)$/.test(key)) continue;
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

  it('serves raw brand assets (icon/logo .svg) from source in dev and dist in prod', () => {
    for (const name of ['icon', 'logo']) {
      expect(exportsMap[`./${name}.svg`], `./${name}.svg`).toEqual({
        development: `./src/brand/${name}.svg`,
        default: `./dist/${name}.svg`,
      });
    }
  });

  it('serves the a11y catalog JSON from source in dev and dist in prod', () => {
    expect(exportsMap['./a11y-catalog.json']).toEqual({
      development: './src/a11y/a11y-catalog.json',
      default: './dist/a11y-catalog.json',
    });
  });
});

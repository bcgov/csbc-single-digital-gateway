import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createAjv, type JsonSchema, type UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import {
  documentHasError,
  errorPropertyKey,
  formHasError,
  formOwnedErrors,
  unownedErrors,
  type FormValidationError,
} from '../src/runner/form-errors';
import { propertyKeyOf, propertyKeysUsed } from '../src/renderers/ui/schema-properties';
import {
  newPropertyKey,
  propertyKeyOf as studioPropertyKeyOf,
  propertyKeysUsed as studioPropertyKeysUsed,
} from '../src/studio/layout/schema-properties';

// Doc 202 rules 29-33, 44-45 — scoping one JsonForms core's errors to the Form on screen, and the pure key
// helper that makes it possible.

const schema: JsonSchema = {
  type: 'object',
  properties: {
    a: { type: 'string', maxLength: 2 },
    b: { type: 'number', minimum: 5 },
    c: { type: 'string' },
  },
  required: ['a'],
};

const el = (element: object) => element as UISchemaElement;
const control = (key: string) => el({ type: 'Control', scope: `#/properties/${key}` });
const form = (...elements: object[]) => el({ type: 'Form', elements });

const required = (missingProperty: string): FormValidationError => ({
  instancePath: '',
  keyword: 'required',
  params: { missingProperty },
});
const at = (instancePath: string, keyword = 'maxLength'): FormValidationError => ({
  instancePath,
  keyword,
  params: {},
});

/** Every `.ts`/`.tsx` file at or below `dir`, for the import-boundary pin. */
const sourceFilesIn = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) return sourceFilesIn(path);
    return entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') ? [path] : [];
  });

describe('per-Form error scoping (doc 202 rules 29-33)', () => {
  describe("a Form's fields (rule 29)", () => {
    it('are the top-level property keys its Controls bind', () => {
      expect([...propertyKeysUsed(form(control('a'), control('b')), schema)].toSorted()).toEqual([
        'a',
        'b',
      ]);
    });

    it('include keys bound by Controls nested in its layouts', () => {
      const nested = form(
        el({ type: 'VerticalLayout', elements: [el({ type: 'Grid', elements: [control('c')] })] }),
      );
      expect([...propertyKeysUsed(nested, schema)]).toEqual(['c']);
    });

    it('exclude a Control whose scope names no property of the schema', () => {
      expect([...propertyKeysUsed(form(control('ghost'), control('a')), schema)]).toEqual(['a']);
      // A nested scope is not a top-level property either (doc 185 rules 17-18).
      expect(
        propertyKeyOf(el({ type: 'Control', scope: '#/properties/a/properties/b' }), schema),
      ).toBeUndefined();
    });
  });

  describe('attributing an error (rules 30-32)', () => {
    const first = form(control('a'));
    const second = form(control('b'));

    it('gives an error with a non-empty instancePath to the Form owning its first segment', () => {
      expect(errorPropertyKey(at('/b', 'minimum'))).toBe('b');
      expect(formHasError(second, schema, [at('/b', 'minimum')])).toBe(true);
      expect(formHasError(first, schema, [at('/b', 'minimum')])).toBe(false);
      // Everything raised beneath a bound key belongs to it.
      expect(errorPropertyKey(at('/a/0/name'))).toBe('a');
    });

    it('gives a root-level required error to the Form owning params.missingProperty (rule 31)', () => {
      expect(errorPropertyKey(required('a'))).toBe('a');
      expect(formHasError(first, schema, [required('a')])).toBe(true);
      expect(formHasError(second, schema, [required('a')])).toBe(false);
    });

    it('does not lose a required error to the empty instancePath — the trap this rule exists for', () => {
      // Attributing by instancePath alone would give this error to NO Form, so Next would never be
      // blocked by a missing required field. Proven against JSONForms' own Ajv, not a hand-written literal.
      const ajv = createAjv();
      ajv.validate(schema, {});
      const real = (ajv.errors ?? []) as FormValidationError[];
      expect(real).toHaveLength(1);
      expect(real[0]?.instancePath).toBe('');
      expect(errorPropertyKey(real[0] as FormValidationError)).toBe('a');
      expect(formOwnedErrors(first, schema, real)).toEqual(real);
    });

    it('attributes an error to no Form when it names no known key (rule 32)', () => {
      const stray: FormValidationError = {
        instancePath: '',
        keyword: 'additionalProperties',
        params: { additionalProperty: 'zz' },
      };
      expect(errorPropertyKey(stray)).toBeUndefined();
      expect(formHasError(first, schema, [stray])).toBe(false);
      expect(formHasError(second, schema, [stray])).toBe(false);
      expect(unownedErrors([first, second], schema, [stray])).toEqual([stray]);
    });

    it('blocks Next nowhere for such an error, but still blocks Submit', () => {
      const stray: FormValidationError = { instancePath: '', keyword: 'minProperties', params: {} };
      expect(formHasError(first, schema, [stray])).toBe(false);
      expect(documentHasError([stray])).toBe(true);
    });

    it('normalises a malformed error rather than throwing', () => {
      for (const bad of [{}, { instancePath: 7 }, { instancePath: '', keyword: 'required' }]) {
        expect(errorPropertyKey(bad as FormValidationError)).toBeUndefined();
      }
      expect(
        errorPropertyKey({ instancePath: '', keyword: 'required', params: null }),
      ).toBeUndefined();
    });
  });

  describe('the empty-string dependency (rule 33)', () => {
    it('pins that Ajv counts an empty string as present, so required passes for it', () => {
      const ajv = createAjv();
      expect(ajv.validate(schema, { a: '' })).toBe(true);
      expect(ajv.errors ?? []).toEqual([]);
    });

    it('therefore depends on controls writing undefined, never empty string', () => {
      // With `undefined` the required check fails and the gate closes; with '' it would silently open.
      const ajv = createAjv();
      ajv.validate(schema, { a: undefined });
      const errors = (ajv.errors ?? []) as FormValidationError[];
      expect(formHasError(form(control('a')), schema, errors)).toBe(true);
      expect(formHasError(form(control('a')), schema, [])).toBe(false);
    });
  });
});

describe('the shared key helper (doc 202 rules 44-45)', () => {
  it('exposes propertyKeyOf and propertyKeysUsed from the shared renderers layer', () => {
    expect(typeof propertyKeyOf).toBe('function');
    expect(typeof propertyKeysUsed).toBe('function');
  });

  it('re-exports them from the studio module, so existing studio callers are untouched', () => {
    expect(studioPropertyKeyOf).toBe(propertyKeyOf);
    expect(studioPropertyKeysUsed).toBe(propertyKeysUsed);
  });

  it('keeps newPropertyKey in the studio, since minting a key is authoring-only', () => {
    expect(typeof newPropertyKey).toBe('function');
    expect(newPropertyKey()).toMatch(/^[\w-]{8}$/);
    const shared = readFileSync(
      resolve(import.meta.dirname, '../src/renderers/ui/schema-properties.ts'),
      'utf8',
    );
    // Anchored to a real import: the header comment names `nanoid` when explaining why key MINTING
    // stayed behind, so a bare substring check fails on the prose rather than on a dependency.
    expect(shared).not.toMatch(/from ['"]nanoid['"]/);
  });

  it('pins that nothing under src/renderers imports src/studio', () => {
    const files = sourceFilesIn(resolve(import.meta.dirname, '../src/renderers'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      // The studio imports DOWN into the shared layer; the reverse would invert the dependency the
      // doc 202 rule 44 move exists to protect.
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/from ['"][^'"]*\/studio\//);
    }
  });
});

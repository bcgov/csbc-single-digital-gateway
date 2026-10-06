import type { Document } from '@repo/database';
import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  documentContentSchema,
  versionContentSchema,
} from '../../../src/modules/templates/dtos/template.dtos';
import { validateContent } from '../../../src/modules/templates/services/validate-content';

// Doc 220 — the API must ACCEPT and VALIDATE a template version's capability map.
//
// THE TRAP this file exists for: the content schema was a plain `z.object({schema, uischema})`,
// and zod STRIPS unknown keys by default. `validateContent` returns `result.data`, so a
// `capabilities` key was silently DELETED on every save — no error, no warning, the map simply gone.
// Validation is deliberate rather than passthrough: feature 222 enforces against this map
// server-side, so a malformed one is a governance hole, not untidy data.

const document = { type: 'services.service-application-method' } as Document;

const content = (capabilities?: unknown) => ({
  schema: { type: 'object', properties: {} },
  variants: { default: { type: 'Form', label: 'A form', elements: [] } },
  ...(capabilities === undefined ? {} : { capabilities }),
});

const MAP = {
  default: { '*': { edit: 'none', remove: false }, Control: { edit: ['label'] } },
  elements: { a1b2c3d4: { edit: 'all', remove: true, addChildren: false } },
};

describe('validateContent — capabilities survive the parse', () => {
  it('KEEPS a capabilities key instead of stripping it', () => {
    const result = validateContent(document, content(MAP));
    expect(result.capabilities).toEqual(MAP);
  });

  it('still accepts content with no capabilities key at all (rule 2)', () => {
    const result = validateContent(document, content());
    expect(result.capabilities).toBeUndefined();
    expect(result.variants['default']?.type).toBe('Form');
  });

  it('keeps the map through versionContentSchema too, so both save paths are covered', () => {
    const parsed = versionContentSchema.parse({ content: content(MAP) });
    expect(parsed.content.capabilities).toEqual(MAP);
  });

  it('accepts an EMPTY map — a template whose author has written no rule yet', () => {
    expect(validateContent(document, content({})).capabilities).toEqual({});
  });
});

describe('validateContent — the map is validated, not trusted', () => {
  const refuses = (capabilities: unknown) => () => validateContent(document, content(capabilities));

  it('rejects a capabilities value that is not an object', () => {
    expect(refuses('everything')).toThrow(BadRequestException);
    expect(refuses([])).toThrow(BadRequestException);
  });

  it('rejects an unknown verb key', () => {
    // `strictObject`: a key nothing reads would look like a permission to an author and mean nothing
    // at all to the enforcer.
    expect(refuses({ elements: { a1: { canDelete: true } } })).toThrow(BadRequestException);
  });

  it('rejects an unknown top-level key in the map', () => {
    expect(refuses({ defaults: {} })).toThrow(BadRequestException);
  });

  it('rejects a non-boolean for a boolean verb', () => {
    expect(refuses({ elements: { a1: { remove: 'yes' } } })).toThrow(BadRequestException);
  });

  it("accepts edit: 'all' | 'none' | string[] and rejects anything else", () => {
    for (const edit of ['all', 'none', ['label', 'description']]) {
      expect(
        validateContent(document, content({ elements: { a1: { edit } } })).capabilities,
      ).toBeDefined();
    }
    expect(refuses({ elements: { a1: { edit: 'some' } } })).toThrow(BadRequestException);
    expect(refuses({ elements: { a1: { edit: [1, 2] } } })).toThrow(BadRequestException);
  });

  it('reports a 400 with a readable message, like every other content failure', () => {
    try {
      validateContent(document, content({ elements: { a1: { remove: 'yes' } } }));
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect(String((error as BadRequestException).message)).toMatch(/remove/i);
    }
  });

  it('is exported as a schema so 222 can reuse it rather than re-deriving the shape', () => {
    expect(documentContentSchema.safeParse(content(MAP)).success).toBe(true);
  });
});

// Doc 231 — the cascade scope an author picks is stored on the entry. `capabilitySchema` is STRICT,
// so without listing it every save carrying a scope would be refused.
describe('validateContent — the cascade scope (doc 231)', () => {
  it('keeps each cascade scope', () => {
    for (const cascade of ['descendants', 'children', 'self']) {
      const map = { elements: { a1: { cascade, removeChildren: false } } };
      expect(validateContent(document, content(map)).capabilities).toEqual(map);
    }
  });

  it('rejects an unknown scope', () => {
    expect(() =>
      validateContent(document, content({ elements: { a1: { cascade: 'everything' } } })),
    ).toThrow(BadRequestException);
  });
});

import { BadRequestException } from '@nestjs/common';
import type { Document } from '@repo/database';
import { describe, expect, it } from 'vitest';
import {
  assertPublishable,
  validateContent,
} from '../../../../src/modules/templates/services/validate-content';

// Doc 275 — content is `{ schema, variants: { default, …others } }`; every variant's root is one the type allows
// AND the default's; publish needs every variant to show every required field.

const SERVICE = { type: 'services.service' } as Document;
const METHOD = { type: 'services.service-application-method' } as Document;
const AGREEMENT = { type: 'services.service-agreement' } as Document;

const schema = { type: 'object', properties: {} };
const root = (type: string) => ({ type, elements: [] });
const content = (variants: Record<string, unknown>) => ({ schema, variants });

describe('validateContent — allowed roots (doc 275)', () => {
  it.each([
    [SERVICE, 'Form'],
    [SERVICE, 'Funnel'],
    [METHOD, 'Form'],
    [METHOD, 'Funnel'],
    [AGREEMENT, 'Form'],
    [AGREEMENT, 'Funnel'],
  ])('accepts a %o document with a %s root', (document, type) => {
    expect(validateContent(document, content({ default: root(type) })).variants['default']).toEqual(
      root(type),
    );
  });

  it.each([
    [SERVICE, 'Service'],
    [SERVICE, 'Flow'],
    [METHOD, 'Flow'],
    [METHOD, 'Service'],
    [AGREEMENT, 'Flow'],
    [AGREEMENT, 'Grid'],
  ])('rejects a %o document with a %s root', (document, type) => {
    expect(() => validateContent(document, content({ default: root(type) }))).toThrow(
      BadRequestException,
    );
  });

  it('rejects a disallowed root in a NON-default variant, naming the variant', () => {
    expect(() =>
      validateContent(SERVICE, content({ default: root('Form'), mobile: root('Service') })),
    ).toThrow(/variant "mobile"/);
  });

  it("rejects a variant whose root differs from the default's, even when both are allowed", () => {
    expect(() =>
      validateContent(METHOD, content({ default: root('Form'), guided: root('Funnel') })),
    ).toThrow(
      /Variant "guided" has a "Funnel" root; every variant must match the default's "Form"/,
    );
  });

  it('accepts several variants sharing the default root', () => {
    const result = validateContent(
      METHOD,
      content({ default: root('Funnel'), short: root('Funnel') }),
    );
    expect(Object.keys(result.variants)).toEqual(['default', 'short']);
  });

  it('rejects content without variants.default', () => {
    expect(() => validateContent(SERVICE, content({ mobile: root('Form') }))).toThrow(
      BadRequestException,
    );
  });

  it('rejects the old top-level uischema shape rather than saving half a document', () => {
    expect(() => validateContent(SERVICE, { schema, uischema: root('Form') })).toThrow(
      BadRequestException,
    );
  });
});

const control = (key: string) => ({ type: 'Control', scope: `#/properties/${key}` });
const form = (...keys: string[]) => ({ type: 'Form', elements: keys.map(control) });

describe('assertPublishable (doc 275)', () => {
  const required = {
    type: 'object',
    properties: { name: { type: 'string', title: 'Full name' }, age: { type: 'number' } },
    required: ['name', 'age'],
  };

  it('passes when every variant shows every required field', () => {
    expect(() =>
      assertPublishable(
        validateContent(SERVICE, {
          schema: required,
          variants: { default: form('name', 'age'), mobile: form('age', 'name') },
        }),
      ),
    ).not.toThrow();
  });

  it('passes a schema with no required fields, even for an empty variant', () => {
    expect(() =>
      assertPublishable(validateContent(SERVICE, content({ default: root('Form') }))),
    ).not.toThrow();
  });

  it('refuses with a 400 naming each variant and the fields it misses', () => {
    const parsed = validateContent(SERVICE, {
      schema: required,
      variants: { default: form('name', 'age'), mobile: form('age') },
    });

    expect(() => assertPublishable(parsed)).toThrow(BadRequestException);
    expect(() => assertPublishable(parsed)).toThrow(
      'Every variant must show every required field: "mobile" is missing Full name',
    );
  });
});

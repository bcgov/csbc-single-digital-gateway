import { describe, expect, it } from 'vitest';
import { validateSubmission } from '../src/modules/applications/util/validate';

const basic = {
  schema: {
    type: 'object',
    required: ['name'],
    properties: { name: { type: 'string' }, age: { type: 'integer' } },
  },
};

const multiStage = {
  stages: [
    {
      pages: [
        { schema: { type: 'object', required: ['a'], properties: { a: { type: 'string' } } } },
      ],
    },
    { pages: [{ schema: { type: 'object', properties: { b: { type: 'boolean' } } } }] },
  ],
};

describe('validateSubmission', () => {
  it('passes valid basic-form data', () => {
    expect(validateSubmission('basic-form', basic, { name: 'Ann', age: 3 }).valid).toBe(true);
  });

  it('fails on a missing required field', () => {
    const result = validateSubmission('basic-form', basic, { age: 3 });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('fails on a wrong type', () => {
    expect(validateSubmission('basic-form', basic, { name: 123 }).valid).toBe(false);
  });

  it('validates every page of a multi-stage form', () => {
    expect(validateSubmission('multi-stage-form', multiStage, { a: 'x', b: true }).valid).toBe(
      true,
    );
    // page 1 requires `a`; page 2's `b` must be boolean.
    expect(validateSubmission('multi-stage-form', multiStage, { b: 'nope' }).valid).toBe(false);
  });
});

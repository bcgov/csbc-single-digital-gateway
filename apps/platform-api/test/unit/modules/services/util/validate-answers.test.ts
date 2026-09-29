import { describe, expect, it } from 'vitest';
import { answerErrors } from '../../../../../src/modules/services/util/validate-answers';

// Doc 230 — a service's staff answers are checked against the version's own form before publish.

const schema = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Business name' },
    email: { type: 'string', format: 'email' },
    address: {
      type: 'object',
      properties: { city: { type: 'string' } },
      required: ['city'],
    },
  },
  required: ['name'],
};

describe('answerErrors (doc 230)', () => {
  it('passes answers the form accepts', () => {
    expect(
      answerErrors(schema, { name: 'Acme', email: 'a@b.ca', address: { city: 'Victoria' } }),
    ).toEqual([]);
  });

  it('names every missing required answer, nested ones by their path', () => {
    expect(answerErrors(schema, { address: {} })).toEqual([
      'name is required',
      'address.city is required',
    ]);
  });

  it('checks formats, as the runner in the browser does', () => {
    const problems = answerErrors(schema, { name: 'Acme', email: 'not-an-email' });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/^email /);
  });

  it('refuses when the form schema itself cannot compile', () => {
    expect(answerErrors({ type: 'not-a-type' }, {})).toEqual([
      "The service's form schema is invalid",
    ]);
  });
});

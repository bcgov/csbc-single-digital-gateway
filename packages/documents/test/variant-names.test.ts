import { describe, expect, it } from 'vitest';
import { variantNameProblem } from '../src/studio/variants/variant-names';

const existing = ['default', 'Mobile'];

describe('variantNameProblem (doc 262 rule 8, Security)', () => {
  it('accepts a trimmed 1-40 character name unique among the variants', () => {
    expect(variantNameProblem('  Print  ', existing)).toBeUndefined();
    expect(variantNameProblem('a', existing)).toBeUndefined();
    expect(variantNameProblem('x'.repeat(40), existing)).toBeUndefined();
  });

  it('refuses an empty or whitespace-only name', () => {
    expect(variantNameProblem('', existing)).toBe('Enter a name.');
    expect(variantNameProblem('   ', existing)).toBe('Enter a name.');
  });

  it('refuses a name longer than 40 characters', () => {
    expect(variantNameProblem('x'.repeat(41), existing)).toBe('Use 40 characters or fewer.');
    // Measured after trimming.
    expect(variantNameProblem(` ${'x'.repeat(40)} `, existing)).toBeUndefined();
  });

  it('refuses default in any case', () => {
    expect(variantNameProblem('default', existing)).toMatch(/reserved/);
    expect(variantNameProblem(' Default ', existing)).toMatch(/reserved/);
  });

  it('refuses a name equal case-insensitively to another variant', () => {
    expect(variantNameProblem('mobile', existing)).toBe(
      'A variant called “mobile” already exists.',
    );
    expect(variantNameProblem('MOBILE ', existing)).toMatch(/already exists/);
  });

  it('allows renaming a variant to its own name', () => {
    expect(variantNameProblem('mobile', existing, 'Mobile')).toBeUndefined();
    expect(variantNameProblem('Mobile', existing, 'Mobile')).toBeUndefined();
    expect(variantNameProblem('Mobile', [...existing, 'Print'], 'Print')).toMatch(/already exists/);
  });

  it('refuses __proto__, constructor and prototype', () => {
    for (const name of ['__proto__', 'constructor', 'Prototype']) {
      expect(variantNameProblem(name, existing)).toMatch(/reserved/);
    }
  });
});

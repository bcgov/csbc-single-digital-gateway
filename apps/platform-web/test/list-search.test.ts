import { describe, expect, it } from 'vitest';
import { listSearchValidator } from '@/lib/list-search';

const validate = listSearchValidator(['title', 'updated', 'status'] as const, {
  sort: 'updated',
  order: 'desc',
});

describe('listSearchValidator', () => {
  it('applies defaults for empty search', () => {
    expect(validate({})).toEqual({ page: 1, sort: 'updated', order: 'desc' });
  });

  it('coerces and clamps page (≥ 1, integer)', () => {
    expect(validate({ page: '3' }).page).toBe(3);
    expect(validate({ page: 0 }).page).toBe(1);
    expect(validate({ page: -5 }).page).toBe(1);
    expect(validate({ page: 2.9 }).page).toBe(2);
    expect(validate({ page: 'nope' }).page).toBe(1);
  });

  it('falls back to the default sort for an unknown column', () => {
    expect(validate({ sort: 'bogus' }).sort).toBe('updated');
    expect(validate({ sort: 'title' }).sort).toBe('title');
  });

  it('only accepts asc/desc for order (else the default)', () => {
    expect(validate({ order: 'asc' }).order).toBe('asc');
    expect(validate({ order: 'sideways' }).order).toBe('desc');
  });

  it('omits an empty/non-string q entirely', () => {
    expect('q' in validate({ q: '' })).toBe(false);
    expect('q' in validate({ q: 5 })).toBe(false);
    expect(validate({ q: 'permit' }).q).toBe('permit');
  });
});

import { describe, expect, it } from 'vitest';
import { adoptVariants } from '../../../../../src/modules/services/util/adopt-variants';

const control = (key: string) => ({ type: 'Control', scope: `#/properties/${key}` });
const content = (variants: Record<string, unknown>) => ({
  schema: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' } } },
  variants,
  data: { name: 'Acme' },
});
const DEFAULT = { type: 'Funnel', elements: [] };
const CITIZEN = { type: 'Form', elements: [control('name'), control('email')] };

// Doc 291 rule 13.
describe('adoptVariants (doc 291 rule 13)', () => {
  describe('adopts', () => {
    it('adds a template variant the content lacks, keeping every variant it has', () => {
      const staff = { type: 'Form', elements: [control('name')] };
      const result = adoptVariants(content({ default: DEFAULT, Staff: staff }), {
        default: { type: 'Funnel', elements: [control('email')] },
        Citizen: CITIZEN,
      });
      expect(result['variants']).toEqual({ default: DEFAULT, Staff: staff, Citizen: CITIZEN });
      // Answers and schema ride along untouched.
      expect(result['data']).toEqual({ name: 'Acme' });
    });

    it('never replaces a variant the content has, matching names case-insensitively', () => {
      const own = { type: 'Form', label: 'Our own citizen view', elements: [] };
      const original = content({ default: DEFAULT, citizen: own });
      const result = adoptVariants(original, { Citizen: CITIZEN });
      expect(result['variants']).toEqual({ default: DEFAULT, citizen: own });
      // Nothing to adopt → the same object back.
      expect(result).toBe(original);
    });

    it('skips a template variant that binds a property the content schema lacks', () => {
      const result = adoptVariants(content({ default: DEFAULT }), {
        Citizen: { type: 'Form', elements: [control('name'), control('phone')] },
        Mobile: { type: 'Form', elements: [control('email')] },
      });
      expect(Object.keys(result['variants'] as object)).toEqual(['default', 'Mobile']);
    });
  });
});

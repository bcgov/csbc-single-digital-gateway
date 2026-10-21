import { describe, expect, it } from 'vitest';
import { carryAnswers } from '../../../../../src/modules/applications/util/carry-answers';

const schema = (properties: Record<string, unknown>) => ({ type: 'object', properties });

// Doc 292.
describe('carryAnswers (doc 292 rule 4)', () => {
  describe('carry', () => {
    it('keeps the answers whose top-level key the new schema declares', () => {
      const data = { name: 'Jane', address: { city: 'Victoria' }, consent: true };
      expect(carryAnswers(data, schema({ name: {}, address: {}, consent: {} }))).toEqual(data);
    });

    it('drops answers for keys the new schema no longer has', () => {
      expect(carryAnswers({ name: 'Jane', fax: '555' }, schema({ name: {}, email: {} }))).toEqual({
        name: 'Jane',
      });
    });

    it('returns {} for a schema without properties', () => {
      expect(carryAnswers({ name: 'Jane' }, { type: 'object' })).toEqual({});
      expect(carryAnswers({ name: 'Jane' }, { properties: ['name'] })).toEqual({});
    });
  });
});

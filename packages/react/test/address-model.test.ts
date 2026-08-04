import { describe, expect, it } from 'vitest';

import {
  ADDRESS_FIELD_KEYS,
  addressDisplayLines,
  emptyAddress,
  isAddressEmpty,
  normalizeAddress,
} from '../src/jsonforms-renderers/controls/address/model';
import {
  DEFAULT_ADDRESS_LABELS,
  addressLabelsForIso2,
} from '../src/jsonforms-renderers/controls/address/labels';

describe('address model', () => {
  describe('normalizeAddress', () => {
    it('coerces a partial blob to all-string fields without throwing', () => {
      const value = normalizeAddress({ country: 'Canada', city: 'Victoria', extra: 1 });
      expect(value.country).toBe('Canada');
      expect(value.city).toBe('Victoria');
      expect(value.province).toBe('');
      expect(value.postal_code).toBe('');
    });

    it('returns an empty address for non-object input', () => {
      expect(normalizeAddress(null)).toEqual(emptyAddress());
      expect(normalizeAddress('nonsense')).toEqual(emptyAddress());
      expect(normalizeAddress(undefined)).toEqual(emptyAddress());
    });

    it('drops non-string field values to empty strings', () => {
      const value = normalizeAddress({ country: 5, province: { name: 'x' }, postal_code: 'V8W' });
      expect(value.country).toBe('');
      expect(value.province).toBe('');
      expect(value.postal_code).toBe('V8W');
    });
  });

  describe('emptyAddress / isAddressEmpty', () => {
    it('a fresh address is empty across every field key', () => {
      const value = emptyAddress();
      expect(isAddressEmpty(value)).toBe(true);
      expect(ADDRESS_FIELD_KEYS.every((k) => value[k] === '')).toBe(true);
    });

    it('is not empty once any field is set', () => {
      expect(isAddressEmpty({ ...emptyAddress(), city: 'Vancouver' })).toBe(false);
    });
  });

  describe('addressDisplayLines', () => {
    it('formats postal-order lines and drops empty segments', () => {
      const lines = addressDisplayLines({
        country: 'Canada',
        address_one: '1 Main St',
        address_two: '',
        city: 'Victoria',
        province: 'British Columbia',
        postal_code: 'V8W 1A1',
      });
      expect(lines).toEqual(['1 Main St', 'Victoria British Columbia V8W 1A1', 'Canada']);
    });
  });
});

describe('address labels', () => {
  it('maps known ISO2 codes to curated labels (case-insensitive)', () => {
    expect(addressLabelsForIso2('US')).toEqual({ stateLabel: 'State', postalLabel: 'ZIP code' });
    expect(addressLabelsForIso2('ca')).toEqual({
      stateLabel: 'Province',
      postalLabel: 'Postal code',
    });
    expect(addressLabelsForIso2('GB').postalLabel).toBe('Postcode');
  });

  it('falls back to the default for unknown / missing codes', () => {
    expect(addressLabelsForIso2('ZZ')).toEqual(DEFAULT_ADDRESS_LABELS);
    expect(addressLabelsForIso2(undefined)).toEqual(DEFAULT_ADDRESS_LABELS);
    expect(addressLabelsForIso2('')).toEqual(DEFAULT_ADDRESS_LABELS);
  });
});

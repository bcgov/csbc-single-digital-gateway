import { describe, expect, it } from 'vitest';
import {
  geoCountrySchema,
  GeoCountryListDto,
  geoStateSchema,
  GeoStateListDto,
  addressSearchRegionSchema,
  AddressSearchRegionListDto,
  addressSuggestionSchema,
  AddressSuggestionListDto,
  addressSearchQuerySchema,
  AddressSearchQueryDto,
} from '../../../../../src/modules/geo/dtos/geo.dtos';

describe('Geo DTOs Unit Test Suite', () => {
  describe('geoCountrySchema and GeoCountryListDto', () => {
    it('Should validate a valid geo country object', () => {
      const valid = {
        id: 1,
        name: 'Canada',
        iso2: 'CA',
        hasStates: true,
        hasPostal: true,
      };
      const result = geoCountrySchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(valid);
      }
    });

    it('Should accept nullable iso2', () => {
      const valid = {
        id: 2,
        name: 'Unknown Territory',
        iso2: null,
        hasStates: false,
        hasPostal: false,
      };
      const result = geoCountrySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('Should reject invalid geo country objects', () => {
      expect(geoCountrySchema.safeParse({ id: 1.5, name: 'Canada' }).success).toBe(false);
      expect(geoCountrySchema.safeParse({ id: 1, name: 123 }).success).toBe(false);
      expect(
        geoCountrySchema.safeParse({
          id: 1,
          name: 'Canada',
          iso2: 'CA',
          hasStates: 'yes',
          hasPostal: true,
        }).success,
      ).toBe(false);
    });

    it('Should instantiate and validate GeoCountryListDto', () => {
      const dto = new GeoCountryListDto();
      expect(dto).toBeDefined();
      const list = {
        items: [
          {
            id: 1,
            name: 'Canada',
            iso2: 'CA',
            hasStates: true,
            hasPostal: true,
          },
        ],
      };
      const parsed = GeoCountryListDto.schema.safeParse(list);
      expect(parsed.success).toBe(true);
    });
  });

  describe('geoStateSchema and GeoStateListDto', () => {
    it('Should validate a valid geo state object', () => {
      const valid = {
        id: 10,
        name: 'British Columbia',
        type: 'province',
        iso2: 'BC',
      };
      const result = geoStateSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(valid);
      }
    });

    it('Should accept nullable type and iso2', () => {
      const valid = {
        id: 11,
        name: 'Some Region',
        type: null,
        iso2: null,
      };
      const result = geoStateSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('Should reject invalid geo state objects', () => {
      expect(geoStateSchema.safeParse({ id: 'ten', name: 'BC' }).success).toBe(false);
      expect(geoStateSchema.safeParse({ id: 10 }).success).toBe(false);
    });

    it('Should instantiate and validate GeoStateListDto', () => {
      const dto = new GeoStateListDto();
      expect(dto).toBeDefined();
      const list = {
        items: [{ id: 10, name: 'British Columbia', type: 'province', iso2: 'BC' }],
      };
      const parsed = GeoStateListDto.schema.safeParse(list);
      expect(parsed.success).toBe(true);
    });
  });

  describe('addressSearchRegionSchema and AddressSearchRegionListDto', () => {
    it('Should validate a valid address search region', () => {
      const valid = {
        country: 'CA',
        province: 'BC',
      };
      const result = addressSearchRegionSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(valid);
      }
    });

    it('Should reject invalid address search region', () => {
      expect(addressSearchRegionSchema.safeParse({ country: 123 }).success).toBe(false);
      expect(addressSearchRegionSchema.safeParse({ country: 'CA' }).success).toBe(false);
    });

    it('Should instantiate and validate AddressSearchRegionListDto', () => {
      const dto = new AddressSearchRegionListDto();
      expect(dto).toBeDefined();
      const list = { items: [{ country: 'CA', province: 'BC' }] };
      const parsed = AddressSearchRegionListDto.schema.safeParse(list);
      expect(parsed.success).toBe(true);
    });
  });

  describe('addressSuggestionSchema and AddressSuggestionListDto', () => {
    it('Should validate a valid address suggestion', () => {
      const valid = {
        label: '501 Belleville St, Victoria, BC',
        streetAddress: '501 Belleville St',
        city: 'Victoria',
        provinceCode: 'BC',
      };
      const result = addressSuggestionSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(valid);
      }
    });

    it('Should reject missing fields in address suggestion', () => {
      expect(addressSuggestionSchema.safeParse({ label: '501 Belleville St' }).success).toBe(false);
    });

    it('Should instantiate and validate AddressSuggestionListDto', () => {
      const dto = new AddressSuggestionListDto();
      expect(dto).toBeDefined();
      const list = {
        items: [
          {
            label: '501 Belleville St, Victoria, BC',
            streetAddress: '501 Belleville St',
            city: 'Victoria',
            provinceCode: 'BC',
          },
        ],
      };
      const parsed = AddressSuggestionListDto.schema.safeParse(list);
      expect(parsed.success).toBe(true);
    });
  });

  describe('addressSearchQuerySchema and AddressSearchQueryDto', () => {
    it('Should validate and trim query parameters', () => {
      const query = {
        country: ' CA ',
        province: ' BC ',
        q: ' 501 Belleville St ',
      };
      const result = addressSearchQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          country: 'CA',
          province: 'BC',
          q: '501 Belleville St',
        });
      }
    });

    it('Should reject country shorter than 2 or longer than 3 characters', () => {
      expect(
        addressSearchQuerySchema.safeParse({ country: 'C', province: 'BC', q: 'Main' }).success,
      ).toBe(false);
      expect(
        addressSearchQuerySchema.safeParse({ country: 'CANX', province: 'BC', q: 'Main' }).success,
      ).toBe(false);
    });

    it('Should reject empty or overly long query text', () => {
      expect(
        addressSearchQuerySchema.safeParse({ country: 'CA', province: 'BC', q: '' }).success,
      ).toBe(false);
      expect(
        addressSearchQuerySchema.safeParse({ country: 'CA', province: 'BC', q: '   ' }).success,
      ).toBe(false);
      expect(
        addressSearchQuerySchema.safeParse({ country: 'CA', province: 'BC', q: 'a'.repeat(101) })
          .success,
      ).toBe(false);
    });

    it('Should instantiate AddressSearchQueryDto', () => {
      const dto = new AddressSearchQueryDto();
      expect(dto).toBeDefined();
    });
  });
});

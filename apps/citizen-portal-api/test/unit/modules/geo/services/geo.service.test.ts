import { beforeEach, describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { type Database, countries, states } from '@repo/database';
import { GeoService } from '../../../../../src/modules/geo/services/geo.service';
import { createMockDb } from '../../../../utils/create-mock-db';

describe('GeoService Unit Test Suite', () => {
  let service: GeoService;
  let dbMock: any;
  let mockResponse: any;

  beforeEach(() => {
    const mocks = createMockDb();
    dbMock = mocks.builderMock;
    mockResponse = mocks.mockResponse;
    service = new GeoService(dbMock as unknown as Database);
  });

  describe('listCountries', () => {
    it('Should map countries with hasStates and hasPostal correctly', async () => {
      const countryRows = [
        {
          id: 1,
          name: 'Canada',
          iso2: 'CA',
          postalFormat: 'A1A 1A1',
        },
        {
          id: 2,
          name: 'United States',
          iso2: 'US',
          postalFormat: '99999',
        },
        {
          id: 3,
          name: 'Country Without Postal',
          iso2: 'CW',
          postalFormat: null,
        },
        {
          id: 4,
          name: 'Country With Empty Postal Format',
          iso2: 'CE',
          postalFormat: '   ',
        },
      ];
      const stateCountryRows = [{ countryId: 1 }, { countryId: 2 }];

      mockResponse(countryRows, countries, 'select');
      mockResponse(stateCountryRows, states, 'select');

      const result = await service.listCountries();

      expect(result).toEqual([
        {
          id: 1,
          name: 'Canada',
          iso2: 'CA',
          hasStates: true,
          hasPostal: true,
        },
        {
          id: 2,
          name: 'United States',
          iso2: 'US',
          hasStates: true,
          hasPostal: true,
        },
        {
          id: 3,
          name: 'Country Without Postal',
          iso2: 'CW',
          hasStates: false,
          hasPostal: false,
        },
        {
          id: 4,
          name: 'Country With Empty Postal Format',
          iso2: 'CE',
          hasStates: false,
          hasPostal: false,
        },
      ]);
    });

    it('Should handle empty countries list', async () => {
      mockResponse([], countries, 'select');
      mockResponse([], states, 'select');

      const result = await service.listCountries();

      expect(result).toEqual([]);
    });
  });

  describe('listStates', () => {
    it('Should return states list for a valid positive integer country id', async () => {
      const stateRows = [
        {
          id: 10,
          name: 'Alberta',
          type: 'province',
          iso2: 'AB',
        },
        {
          id: 11,
          name: 'British Columbia',
          type: 'province',
          iso2: 'BC',
        },
      ];

      mockResponse(stateRows, states, 'select');

      const result = await service.listStates('1');

      expect(result).toEqual(stateRows);
    });

    it('Should return empty array if country has no states', async () => {
      mockResponse([], states, 'select');

      const result = await service.listStates('999');

      expect(result).toEqual([]);
    });

    it('Should throw BadRequestException when country id is not a positive integer', async () => {
      await expect(service.listStates('abc')).rejects.toThrow(BadRequestException);
      await expect(service.listStates('0')).rejects.toThrow(BadRequestException);
      await expect(service.listStates('-1')).rejects.toThrow(BadRequestException);
      await expect(service.listStates('1.5')).rejects.toThrow(BadRequestException);
      await expect(service.listStates('')).rejects.toThrow(BadRequestException);
    });
  });
});

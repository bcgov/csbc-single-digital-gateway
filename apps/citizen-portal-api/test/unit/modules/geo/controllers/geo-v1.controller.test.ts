import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GeoV1Controller } from '../../../../../src/modules/geo/controllers/geo-v1.controller';
import { GeoService } from '../../../../../src/modules/geo/services/geo.service';
import { GeocoderService } from '../../../../../src/modules/geo/services/geocoder.service';
import type { AddressSearchQueryDto } from '../../../../../src/modules/geo/dtos/geo.dtos';

describe('GeoV1Controller Unit Test Suite', () => {
  let controller: GeoV1Controller;
  let geoServiceMock: {
    listCountries: ReturnType<typeof vi.fn>;
    listStates: ReturnType<typeof vi.fn>;
  };
  let geocoderServiceMock: {
    regions: ReturnType<typeof vi.fn>;
    search: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    geoServiceMock = {
      listCountries: vi.fn(),
      listStates: vi.fn(),
    };
    geocoderServiceMock = {
      regions: vi.fn(),
      search: vi.fn(),
    };
    controller = new GeoV1Controller(
      geoServiceMock as unknown as GeoService,
      geocoderServiceMock as unknown as GeocoderService,
    );
  });

  describe('listCountries', () => {
    it('should return list of countries wrapped in items', async () => {
      const mockCountries = [
        {
          id: 'country-1',
          name: 'Canada',
          iso2: 'CA',
          iso3: 'CAN',
          phoneCode: '1',
          postalCodeRegex: '^[A-Z]\\d[A-Z] \\d[A-Z]\\d$',
        },
      ];
      geoServiceMock.listCountries.mockResolvedValue(mockCountries);

      const result = await controller.listCountries();

      expect(geoServiceMock.listCountries).toHaveBeenCalledOnce();
      expect(result).toEqual({ items: mockCountries });
    });
  });

  describe('listStates', () => {
    it('should return list of states for a country wrapped in items', async () => {
      const mockStates = [
        {
          id: 'state-1',
          countryId: 'country-1',
          name: 'British Columbia',
          stateCode: 'BC',
        },
      ];
      geoServiceMock.listStates.mockResolvedValue(mockStates);

      const result = await controller.listStates('country-1');

      expect(geoServiceMock.listStates).toHaveBeenCalledWith('country-1');
      expect(result).toEqual({ items: mockStates });
    });
  });

  describe('addressSearchRegions', () => {
    it('should return supported regions wrapped in items', () => {
      const mockRegions = [{ country: 'CA', province: 'BC' }];
      geocoderServiceMock.regions.mockReturnValue(mockRegions);

      const result = controller.addressSearchRegions();

      expect(geocoderServiceMock.regions).toHaveBeenCalledOnce();
      expect(result).toEqual({ items: mockRegions });
    });
  });

  describe('addressSearch', () => {
    it('should delegate search to geocoder and return suggestions wrapped in items', async () => {
      const query: AddressSearchQueryDto = {
        country: 'CA',
        province: 'BC',
        q: '501 Belleville St',
      };
      const mockSuggestions = [
        {
          fullAddress: '501 Belleville St, Victoria, BC',
          address1: '501 Belleville St',
          city: 'Victoria',
          province: 'BC',
          country: 'CA',
          postalCode: 'V8V 1X4',
        },
      ];
      geocoderServiceMock.search.mockResolvedValue(mockSuggestions);

      const result = await controller.addressSearch(query);

      expect(geocoderServiceMock.search).toHaveBeenCalledWith('CA', 'BC', '501 Belleville St');
      expect(result).toEqual({ items: mockSuggestions });
    });
  });
});

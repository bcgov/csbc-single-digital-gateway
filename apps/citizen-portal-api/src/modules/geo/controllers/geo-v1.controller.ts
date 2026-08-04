import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@repo/nestjs/auth';
import { ZodSerializerDto } from 'nestjs-zod';

import {
  AddressSearchQueryDto,
  AddressSearchRegionListDto,
  AddressSuggestionListDto,
  GeoCountryListDto,
  GeoStateListDto,
} from '../dtos/geo.dtos';
import { GeoService } from '../services/geo.service';
import { GeocoderService } from '../services/geocoder.service';

/**
 * `/v1/geo` — PUBLIC reference data for the address form field (feature 153). Countries and their
 * states/provinces. Every route is `@Public` (no user data, no writes).
 */
@ApiTags('Geo')
@Controller({ path: 'geo', version: '1' })
export class GeoV1Controller {
  constructor(
    private readonly geo: GeoService,
    private readonly geocoder: GeocoderService,
  ) {}

  @Public()
  @Get('countries')
  @ZodSerializerDto(GeoCountryListDto)
  async listCountries() {
    return { items: await this.geo.listCountries() };
  }

  @Public()
  @Get('countries/:id/states')
  @ZodSerializerDto(GeoStateListDto)
  async listStates(@Param('id') id: string) {
    return { items: await this.geo.listStates(id) };
  }

  // The (country, province) ISO2 pairs the server can run address search for (feature 154). Empty
  // when no geocoder is configured → the web control hides the "Search for your address" field.
  @Public()
  @Get('address-search/regions')
  @ZodSerializerDto(AddressSearchRegionListDto)
  addressSearchRegions() {
    return { items: this.geocoder.regions() };
  }

  @Public()
  @Get('address-search')
  @ZodSerializerDto(AddressSuggestionListDto)
  async addressSearch(@Query() query: AddressSearchQueryDto) {
    return { items: await this.geocoder.search(query.country, query.province, query.q) };
  }
}

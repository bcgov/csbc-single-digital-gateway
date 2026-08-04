import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@repo/nestjs/auth';
import { ZodSerializerDto } from 'nestjs-zod';

import { GeoCountryListDto, GeoStateListDto } from '../dtos/geo.dtos';
import { GeoService } from '../services/geo.service';

/**
 * `/v1/geo` — PUBLIC reference data for the address form field (feature 153). Countries and their
 * states/provinces. Every route is `@Public` (no user data, no writes).
 */
@ApiTags('Geo')
@Controller({ path: 'geo', version: '1' })
export class GeoV1Controller {
  constructor(private readonly geo: GeoService) {}

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
}

import { Module } from '@nestjs/common';

import { GeoV1Controller } from './controllers/geo-v1.controller';
import { GeoService } from './services/geo.service';
import { GeocoderService } from './services/geocoder.service';

/**
 * Public geo reference data (feature 153): countries + states/provinces for the address form field.
 * Read-only, workspace-free. Imported by AppModule.
 */
@Module({
  controllers: [GeoV1Controller],
  providers: [GeoService, GeocoderService],
})
export class GeoModule {}

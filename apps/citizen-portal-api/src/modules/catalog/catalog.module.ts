import { Module } from '@nestjs/common';
import { CatalogV1Controller } from './controllers/catalog-v1.controller';
import { MeV1Controller } from './controllers/me-v1.controller';
import { CatalogService } from './services/catalog.service';

/**
 * The citizen service catalog (feature 60): a public, workspace-free read view of published
 * services + the signed-in citizen's applications. Imported by AppModule.
 */
@Module({
  controllers: [CatalogV1Controller, MeV1Controller],
  providers: [CatalogService],
})
export class CatalogModule {}

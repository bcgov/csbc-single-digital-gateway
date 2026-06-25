import { Module } from '@nestjs/common';
import { ServiceReferencesV1Controller } from './controllers/service-references-v1.controller';
import { ServicesV1Controller } from './controllers/services-v1.controller';
import { ReferencesService } from './services/references.service';
import { ServiceTypeResolver } from './services/service-type.resolver';
import { ServiceVersionsService } from './services/service-versions.service';
import { ServicesService } from './services/services.service';

@Module({
  controllers: [ServicesV1Controller, ServiceReferencesV1Controller],
  providers: [ServicesService, ServiceVersionsService, ServiceTypeResolver, ReferencesService],
})
export class ServicesModule {}

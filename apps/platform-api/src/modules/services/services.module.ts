import { Module } from '@nestjs/common';
import { ServicesV1Controller } from './controllers/services-v1.controller';
import { ServiceTypeResolver } from './services/service-type.resolver';
import { ServiceVersionsService } from './services/service-versions.service';
import { ServicesService } from './services/services.service';

@Module({
  controllers: [ServicesV1Controller],
  providers: [ServicesService, ServiceVersionsService, ServiceTypeResolver],
})
export class ServicesModule {}

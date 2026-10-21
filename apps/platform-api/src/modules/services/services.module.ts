import { Module } from '@nestjs/common';
import { TemplatesModule } from '../templates/templates.module';
import { ServicesV1Controller } from './controllers/services-v1.controller';
import { ReferenceableServicesService } from './services/referenceable-services.service';
import { ServiceMethodLifecycle } from './services/service-method-lifecycle.service';
import { ServiceMethodsService } from './services/service-methods.service';
import { ServiceVersionsService } from './services/service-versions.service';
import { ServicesService } from './services/services.service';

@Module({
  imports: [TemplatesModule],
  controllers: [ServicesV1Controller],
  providers: [
    ServicesService,
    ServiceVersionsService,
    ServiceMethodsService,
    ServiceMethodLifecycle,
    ReferenceableServicesService,
  ],
})
export class ServicesModule {}

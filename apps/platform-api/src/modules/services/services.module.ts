import { Module } from '@nestjs/common';
import { TemplatesModule } from '../templates/templates.module';
import { ServicesV1Controller } from './controllers/services-v1.controller';
import { ServiceVersionsService } from './services/service-versions.service';
import { ServicesService } from './services/services.service';

@Module({
  imports: [TemplatesModule],
  controllers: [ServicesV1Controller],
  providers: [ServicesService, ServiceVersionsService],
})
export class ServicesModule {}

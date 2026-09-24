import { Module } from '@nestjs/common';
import { TemplatesModule } from '../templates/templates.module';
import { ServiceAgreementsV1Controller } from './controllers/service-agreements-v1.controller';
import { ServiceAgreementsService } from './services/service-agreements.service';

@Module({
  imports: [TemplatesModule],
  controllers: [ServiceAgreementsV1Controller],
  providers: [ServiceAgreementsService],
})
export class ServiceAgreementsModule {}

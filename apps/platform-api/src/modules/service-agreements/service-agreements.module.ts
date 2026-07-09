import { Module } from '@nestjs/common';
import { ServiceAgreementsV1Controller } from './controllers/service-agreements-v1.controller';
import { ServiceAgreementTypeResolver } from './services/service-agreement-type.resolver';
import { ServiceAgreementsService } from './services/service-agreements.service';

@Module({
  controllers: [ServiceAgreementsV1Controller],
  providers: [ServiceAgreementsService, ServiceAgreementTypeResolver],
})
export class ServiceAgreementsModule {}

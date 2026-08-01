import { Module } from '@nestjs/common';
import { MyServiceAgreementsV1Controller } from './controllers/my-service-agreements-v1.controller';
import { ServiceAgreementsService } from './services/service-agreements.service';

/** Citizen service-agreement consent history (feature 139). Reads only; DB comes from the global module. */
@Module({
  controllers: [MyServiceAgreementsV1Controller],
  providers: [ServiceAgreementsService],
})
export class ServiceAgreementsModule {}

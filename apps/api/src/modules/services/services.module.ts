import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { ServiceTypesAdminV1Controller } from './controllers/service-types-admin-v1.controller';
import { ServicesAdminV1Controller } from './controllers/services-admin-v1.controller';
import { ServiceContributorGuard } from './guards/service-contributor.guard';
import { ServiceContributorsService } from './services/service-contributors.service';
import { ServiceTypesService } from './services/service-types.service';
import { ServicesService } from './services/services.service';

@Module({
  imports: [DatabaseModule, UsersModule],
  controllers: [
    ServiceTypesAdminV1Controller,
    ServicesAdminV1Controller,
  ],
  providers: [
    ServiceTypesService,
    ServicesService,
    ServiceContributorsService,
    ServiceContributorGuard,
  ],
})
export class ServicesModule {}

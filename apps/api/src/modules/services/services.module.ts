import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { ServiceTypesAdminV1Controller } from './controllers/service-types-admin-v1.controller';
import { ServicesAdminV1Controller } from './controllers/services-admin-v1.controller';
import { ServicesV1Controller } from './controllers/services-v1.controller';
import { ServiceContributorGuard } from './guards/service-contributor.guard';
import { ServiceContributorsService } from './services/service-contributors.service';
import { ServiceTypesService } from './services/service-types.service';
import { ServicesService } from './services/services.service';
import { WorkflowProcessService } from './services/workflow-process.service';

@Module({
  imports: [DatabaseModule, UsersModule, HttpModule],
  controllers: [
    ServiceTypesAdminV1Controller,
    ServicesAdminV1Controller,
    ServicesV1Controller,
  ],
  providers: [
    ServiceTypesService,
    ServicesService,
    ServiceContributorsService,
    ServiceContributorGuard,
    WorkflowProcessService,
  ],
})
export class ServicesModule {}

import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { ApplicationsV1Controller } from './controllers/applications-v1.controller';
import { MyApplicationsV1Controller } from './controllers/my-applications-v1.controller';
import { ApplicationsService } from './services/applications.service';
import { WorkflowActorClientService } from './services/workflow-actor-client.service';
import { WorkflowTriggerService } from './services/workflow-trigger.service';

@Module({
  imports: [DatabaseModule, HttpModule, UsersModule],
  controllers: [ApplicationsV1Controller, MyApplicationsV1Controller],
  providers: [
    ApplicationsService,
    WorkflowTriggerService,
    WorkflowActorClientService,
  ],
})
export class ApplicationsModule {}

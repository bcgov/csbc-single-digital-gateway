import { Module } from '@nestjs/common';
import { WorkspacesV1Controller } from './controllers/workspaces-v1.controller';
import { WorkspacesService } from './services/workspaces.service';

@Module({
  controllers: [WorkspacesV1Controller],
  providers: [WorkspacesService],
})
export class WorkspacesModule {}

import { Module } from '@nestjs/common';
import { DefaultAgreementsV1Controller } from './controllers/default-agreements-v1.controller';
import { DefaultAgreementsService } from './services/default-agreements.service';

/** Workspace-admin management of a workspace's default service agreements (feature 96). */
@Module({
  controllers: [DefaultAgreementsV1Controller],
  providers: [DefaultAgreementsService],
})
export class DefaultAgreementsModule {}

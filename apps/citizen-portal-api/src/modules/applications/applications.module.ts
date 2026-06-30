import { Module } from '@nestjs/common';
import { ApplicationFormsV1Controller } from './controllers/application-forms-v1.controller';
import { MyApplicationsV1Controller } from './controllers/my-applications-v1.controller';
import { ApplicationsService } from './services/applications.service';

/**
 * The citizen application surface (feature 63): the public form-to-fill read on the services tree,
 * and the private `/v1/me/applications` draft → submit lifecycle (which subsumes the applications
 * list previously served by the catalog module).
 */
@Module({
  controllers: [ApplicationFormsV1Controller, MyApplicationsV1Controller],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}

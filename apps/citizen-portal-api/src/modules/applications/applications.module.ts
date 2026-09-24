import { Module } from '@nestjs/common';
import { MyApplicationsV1Controller } from './controllers/my-applications-v1.controller';
import { ApplicationsService } from './services/applications.service';

/**
 * The citizen application surface (feature 63): the private `/v1/me/applications` draft → submit
 * lifecycle.
 *
 * Feature 217 removed the two reference-backed surfaces. The public form-to-fill read
 * (`GET /v1/services/:id/applications/:formId`) resolved a form through the service's
 * `application_form` references, and the service-agreement consent surface resolved agreements
 * through `service_agreement` references and the workspace defaults. Both come back when documents
 * can link to one another again.
 */
@Module({
  controllers: [MyApplicationsV1Controller],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}

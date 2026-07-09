import { Module } from '@nestjs/common';
import { ApplicationFormsV1Controller } from './controllers/application-forms-v1.controller';
import { ConsentV1Controller } from './controllers/consent-v1.controller';
import { MyApplicationsV1Controller } from './controllers/my-applications-v1.controller';
import { ApplicationsService } from './services/applications.service';
import { ConsentService } from './services/consent.service';

/**
 * The citizen application surface (feature 63): the public form-to-fill read on the services tree,
 * the private `/v1/me/applications` draft → submit lifecycle, and (feature 89) the service-agreement
 * consent surface/record + submit enforcement.
 */
@Module({
  controllers: [ApplicationFormsV1Controller, MyApplicationsV1Controller, ConsentV1Controller],
  providers: [ApplicationsService, ConsentService],
})
export class ApplicationsModule {}

import { Module } from '@nestjs/common';
import { AdminTemplatesV1Controller } from './controllers/admin-templates-v1.controller';
import { TemplatesV1Controller } from './controllers/templates-v1.controller';
import { TemplateResolver } from './services/template.resolver';
import { TemplateVersionsService } from './services/template-versions.service';
import { TemplatesService } from './services/templates.service';

/**
 * Feature 217. Replaces `DocumentTypesModule`: a "type" is now a `documents` row with
 * `kind = 'template'`. `TemplateResolver` is EXPORTED — the services and service-agreements
 * modules resolve their template through it instead of owning a resolver each.
 */
@Module({
  controllers: [AdminTemplatesV1Controller, TemplatesV1Controller],
  providers: [TemplatesService, TemplateVersionsService, TemplateResolver],
  exports: [TemplateResolver],
})
export class TemplatesModule {}

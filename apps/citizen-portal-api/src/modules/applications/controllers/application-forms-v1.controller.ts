import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@repo/nestjs/auth';
import { ZodSerializerDto } from 'nestjs-zod';
import { ApplicationFormToFillDto } from '../dtos/application.dtos';
import { ApplicationsService } from '../services/applications.service';

/**
 * `/v1/services/:id/applications/:formId` — PUBLIC read of the form a citizen would fill to apply
 * for a service (its kind + render structure). Lives on the public services tree; submitting an
 * application is private and lives under `/v1/me/applications`.
 */
@ApiTags('Catalog')
@Controller({ path: 'services', version: '1' })
export class ApplicationFormsV1Controller {
  constructor(private readonly applications: ApplicationsService) {}

  @Public()
  @Get(':id/applications/:formId')
  @ZodSerializerDto(ApplicationFormToFillDto)
  getForm(@Param('id') id: string, @Param('formId') formId: string) {
    return this.applications.getApplicationForm(id, formId);
  }
}

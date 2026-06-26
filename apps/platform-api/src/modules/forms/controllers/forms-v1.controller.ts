import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type AuthUser, CurrentUser } from '@repo/nestjs/auth';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  CreateFormDto,
  FormVersionDto,
  FormWithVersionDto,
  UpdateFormSchemaDto,
} from '../dtos/form.dtos';
import { FormsService } from '../services/forms.service';

/**
 * `/v1/forms` — staff-facing form documents (basic-form / multi-stage-form types).
 * Protected-by-default (session); per-workspace membership authz lives in the service.
 */
@ApiTags('Forms')
@Controller({ path: 'forms', version: '1' })
export class FormsV1Controller {
  constructor(private readonly forms: FormsService) {}

  @Post()
  @ZodSerializerDto(FormWithVersionDto)
  create(@CurrentUser() user: AuthUser, @Body() body: CreateFormDto) {
    return this.forms.create(user.id, body);
  }

  @Get(':id')
  @ZodSerializerDto(FormWithVersionDto)
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.forms.get(user.id, id);
  }

  @Patch(':id/versions/:versionId')
  @ZodSerializerDto(FormVersionDto)
  updateSchema(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Body() body: UpdateFormSchemaDto,
  ) {
    return this.forms.updateSchema(user.id, id, versionId, body);
  }
}

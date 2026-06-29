import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type AuthUser, CurrentUser } from '@repo/nestjs/auth';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  AddReferenceDto,
  CreateReferencedFormDto,
  ReferenceDto,
  ReferenceListDto,
} from '../dtos/reference.dtos';
import { ReferencesService } from '../services/references.service';

/** `/v1/services/:id/versions/:versionId/{references,forms}` — manage a service version's references. */
@ApiTags('Services')
@Controller({ path: 'services', version: '1' })
export class ServiceReferencesV1Controller {
  constructor(private readonly references: ReferencesService) {}

  @Get(':id/versions/:versionId/references')
  @ZodSerializerDto(ReferenceListDto)
  async list(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return { items: await this.references.list(user.id, id, versionId) };
  }

  @Post(':id/versions/:versionId/references')
  @ZodSerializerDto(ReferenceDto)
  add(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Body() body: AddReferenceDto,
  ) {
    return this.references.add(user.id, id, versionId, body);
  }

  @Delete(':id/versions/:versionId/references/:referenceId')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Param('referenceId') referenceId: string,
  ): Promise<void> {
    await this.references.remove(user.id, id, versionId, referenceId);
  }

  @Post(':id/versions/:versionId/references/:referenceId/archive')
  @HttpCode(204)
  async archive(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Param('referenceId') referenceId: string,
  ): Promise<void> {
    await this.references.archive(user.id, id, versionId, referenceId);
  }

  @Post(':id/versions/:versionId/forms')
  @ZodSerializerDto(ReferenceDto)
  createForm(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Body() body: CreateReferencedFormDto,
  ) {
    return this.references.createForm(user.id, id, versionId, body);
  }
}

import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type AuthUser, CurrentUser } from '@repo/nestjs/auth';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  AgreementRefDto,
  AgreementRefListDto,
  AttachAgreementDto,
} from '../dtos/agreement-ref.dtos';
import {
  AddReferenceDto,
  CreateReferencedFormDto,
  ReferenceDto,
  ReferenceListDto,
} from '../dtos/reference.dtos';
import { AgreementRefsService } from '../services/agreement-refs.service';
import { ReferencesService } from '../services/references.service';

/** `/v1/services/:id/versions/:versionId/{references,forms,agreements}` — a service version's references. */
@ApiTags('Services')
@Controller({ path: 'services', version: '1' })
export class ServiceReferencesV1Controller {
  constructor(
    private readonly references: ReferencesService,
    private readonly agreements: AgreementRefsService,
  ) {}

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

  @Get(':id/versions/:versionId/agreements')
  @ZodSerializerDto(AgreementRefListDto)
  async listAgreements(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return { items: await this.agreements.list(user.id, id, versionId) };
  }

  @Post(':id/versions/:versionId/agreements')
  @ZodSerializerDto(AgreementRefDto)
  attachAgreement(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Body() body: AttachAgreementDto,
  ) {
    return this.agreements.attach(user.id, id, versionId, body.agreementDocumentId);
  }

  @Delete(':id/versions/:versionId/agreements/:referenceId')
  @HttpCode(204)
  async detachAgreement(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Param('referenceId') referenceId: string,
  ): Promise<void> {
    await this.agreements.detach(user.id, id, versionId, referenceId);
  }
}

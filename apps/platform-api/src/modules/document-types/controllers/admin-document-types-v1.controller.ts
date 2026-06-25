import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '@repo/nestjs/auth';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  AdminDocumentTypeListDto,
  CreateDocumentTypeDto,
  DocumentTypeVersionDto,
  DocumentTypeWithVersionsDto,
  VersionDefinitionDto,
} from '../dtos/document-type.dtos';
import { DocumentTypeVersionsService } from '../services/document-type-versions.service';
import { DocumentTypesService } from '../services/document-types.service';

/** `/v1/admin/document-types` — admin-only lifecycle management. */
@ApiTags('Document Types (admin)')
@Roles('admin')
@Controller({ path: 'admin/document-types', version: '1' })
export class AdminDocumentTypesV1Controller {
  constructor(
    private readonly types: DocumentTypesService,
    private readonly versions: DocumentTypeVersionsService,
  ) {}

  @Get()
  @ZodSerializerDto(AdminDocumentTypeListDto)
  async list() {
    return { items: await this.types.adminList() };
  }

  @Post()
  @ZodSerializerDto(DocumentTypeWithVersionsDto)
  create(@Body() body: CreateDocumentTypeDto) {
    return this.types.create(body);
  }

  @Get(':id')
  @ZodSerializerDto(DocumentTypeWithVersionsDto)
  get(@Param('id') id: string) {
    return this.types.adminGet(id);
  }

  @Post(':id/versions')
  @ZodSerializerDto(DocumentTypeVersionDto)
  addVersion(@Param('id') id: string, @Body() body: VersionDefinitionDto) {
    return this.versions.addVersion(id, body.definition);
  }

  @Patch(':id/versions/:versionId')
  @ZodSerializerDto(DocumentTypeVersionDto)
  editVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Body() body: VersionDefinitionDto,
  ) {
    return this.versions.editDraft(id, versionId, body.definition);
  }

  @Delete(':id/versions/:versionId')
  @HttpCode(204)
  async deleteVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ): Promise<void> {
    await this.versions.deleteDraft(id, versionId);
  }

  @Post(':id/versions/:versionId/publish')
  @ZodSerializerDto(DocumentTypeVersionDto)
  publish(@Param('id') id: string, @Param('versionId') versionId: string) {
    return this.versions.publish(id, versionId);
  }

  @Post(':id/versions/:versionId/archive')
  @ZodSerializerDto(DocumentTypeVersionDto)
  archive(@Param('id') id: string, @Param('versionId') versionId: string) {
    return this.versions.archive(id, versionId);
  }
}

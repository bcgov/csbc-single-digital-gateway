import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '@repo/nestjs/auth';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  AdminTemplateDetailDto,
  AdminTemplateListDto,
  CreateTemplateDto,
  TemplateVersionDto,
  TemplateWithVersionsDto,
  VersionContentDto,
} from '../dtos/template.dtos';
import { TemplateLifecycleService } from '../services/template-lifecycle.service';
import { TemplateVersionsService } from '../services/template-versions.service';
import { TemplatesService } from '../services/templates.service';

/** `/v1/admin/templates` — admin-only lifecycle management (feature 217). */
@ApiTags('Templates (admin)')
@Roles('admin')
@Controller({ path: 'admin/templates', version: '1' })
export class AdminTemplatesV1Controller {
  constructor(
    private readonly templates: TemplatesService,
    private readonly versions: TemplateVersionsService,
    private readonly lifecycle: TemplateLifecycleService,
  ) {}

  @Get()
  @ZodSerializerDto(AdminTemplateListDto)
  async list() {
    return { items: await this.templates.adminList() };
  }

  /** Doc 227: a new GLOBAL template with a draft v1 of the type's blank content. */
  @Post()
  @ZodSerializerDto(TemplateWithVersionsDto)
  create(@Body() body: CreateTemplateDto) {
    return this.lifecycle.create(body);
  }

  @Get(':id')
  @ZodSerializerDto(AdminTemplateDetailDto)
  async get(@Param('id', ParseUUIDPipe) id: string) {
    const detail = await this.templates.adminGet(id);
    return { ...detail, deletable: await this.lifecycle.deletable(id, detail.versions) };
  }

  /** Doc 227: refused (409, with the reason) while any document uses the template. */
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.lifecycle.remove(id);
  }

  @Post(':id/versions')
  @ZodSerializerDto(TemplateVersionDto)
  addVersion(@Param('id') id: string, @Body() body: VersionContentDto) {
    return this.versions.addVersion(id, body.content);
  }

  @Patch(':id/versions/:versionId')
  @ZodSerializerDto(TemplateVersionDto)
  editVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Body() body: VersionContentDto,
  ) {
    return this.versions.editDraft(id, versionId, body.content);
  }

  /** Doc 227: any status, but never the last version or one a document version is based on. */
  @Delete(':id/versions/:versionId')
  @HttpCode(204)
  async deleteVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ): Promise<void> {
    await this.lifecycle.removeVersion(id, versionId);
  }

  @Post(':id/versions/:versionId/publish')
  @ZodSerializerDto(TemplateVersionDto)
  publish(@Param('id') id: string, @Param('versionId') versionId: string) {
    return this.versions.publish(id, versionId);
  }

  @Post(':id/versions/:versionId/archive')
  @ZodSerializerDto(TemplateVersionDto)
  archive(@Param('id') id: string, @Param('versionId') versionId: string) {
    return this.versions.archive(id, versionId);
  }
}

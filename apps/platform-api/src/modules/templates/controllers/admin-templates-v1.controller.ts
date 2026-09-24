import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '@repo/nestjs/auth';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  AdminTemplateListDto,
  TemplateVersionDto,
  TemplateWithVersionsDto,
  VersionContentDto,
} from '../dtos/template.dtos';
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
  ) {}

  // Templates themselves are not created via the API (seeded only); admins manage their versions.

  @Get()
  @ZodSerializerDto(AdminTemplateListDto)
  async list() {
    return { items: await this.templates.adminList() };
  }

  @Get(':id')
  @ZodSerializerDto(TemplateWithVersionsDto)
  get(@Param('id') id: string) {
    return this.templates.adminGet(id);
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

  @Delete(':id/versions/:versionId')
  @HttpCode(204)
  async deleteVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ): Promise<void> {
    await this.versions.deleteDraft(id, versionId);
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

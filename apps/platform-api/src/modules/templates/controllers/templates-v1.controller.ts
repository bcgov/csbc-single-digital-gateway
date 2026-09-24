import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { StaffTemplateListDto, TemplateDetailDto, TemplateVersionDto } from '../dtos/template.dtos';
import { TemplatesService } from '../services/templates.service';

/** `/v1/templates` — staff read access to the published catalog + history (feature 217). */
@ApiTags('Templates')
@Controller({ path: 'templates', version: '1' })
export class TemplatesV1Controller {
  constructor(private readonly templates: TemplatesService) {}

  @Get()
  @ZodSerializerDto(StaffTemplateListDto)
  async list() {
    return { items: await this.templates.staffList() };
  }

  @Get(':id')
  @ZodSerializerDto(TemplateDetailDto)
  get(@Param('id') id: string) {
    return this.templates.staffGet(id);
  }

  @Get(':id/versions/:versionId')
  @ZodSerializerDto(TemplateVersionDto)
  getVersion(@Param('id') id: string, @Param('versionId') versionId: string) {
    return this.templates.staffGetVersion(id, versionId);
  }
}

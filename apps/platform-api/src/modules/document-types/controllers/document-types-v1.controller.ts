import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  DocumentTypeDetailDto,
  DocumentTypeVersionDto,
  StaffDocumentTypeListDto,
} from '../dtos/document-type.dtos';
import { DocumentTypesService } from '../services/document-types.service';

/** `/v1/document-types` — staff read access to the published catalog + history. */
@ApiTags('Document Types')
@Controller({ path: 'document-types', version: '1' })
export class DocumentTypesV1Controller {
  constructor(private readonly types: DocumentTypesService) {}

  @Get()
  @ZodSerializerDto(StaffDocumentTypeListDto)
  async list() {
    return { items: await this.types.staffList() };
  }

  @Get(':id')
  @ZodSerializerDto(DocumentTypeDetailDto)
  get(@Param('id') id: string) {
    return this.types.staffGet(id);
  }

  @Get(':id/versions/:versionId')
  @ZodSerializerDto(DocumentTypeVersionDto)
  getVersion(@Param('id') id: string, @Param('versionId') versionId: string) {
    return this.types.staffGetVersion(id, versionId);
  }
}

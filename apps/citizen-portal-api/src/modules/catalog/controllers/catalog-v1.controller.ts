import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@repo/nestjs/auth';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  CatalogServiceDetailDto,
  CatalogServiceListDto,
  CatalogServiceVersionDto,
  ListServicesQueryDto,
} from '../dtos/catalog.dtos';
import { CatalogService } from '../services/catalog.service';

/**
 * `/v1/services` — the PUBLIC, workspace-free service catalog. Anonymous and authenticated citizens
 * alike can browse it (every route is `@Public`). Service versions are readable only when published
 * or archived (drafts stay staff-internal).
 */
@ApiTags('Catalog')
@Controller({ path: 'services', version: '1' })
export class CatalogV1Controller {
  constructor(private readonly catalog: CatalogService) {}

  @Public()
  @Get()
  @ZodSerializerDto(CatalogServiceListDto)
  async list(@Query() query: ListServicesQueryDto) {
    return { items: await this.catalog.listServices(query) };
  }

  @Public()
  @Get(':id')
  @ZodSerializerDto(CatalogServiceDetailDto)
  get(@Param('id') id: string) {
    return this.catalog.getService(id);
  }

  @Public()
  @Get(':id/versions/:versionId')
  @ZodSerializerDto(CatalogServiceVersionDto)
  getVersion(@Param('id') id: string, @Param('versionId') versionId: string) {
    return this.catalog.getServiceVersion(id, versionId);
  }
}

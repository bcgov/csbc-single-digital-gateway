import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type AuthUser, CurrentUser } from '@repo/nestjs/auth';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  CreateServiceDto,
  DefinitionDto,
  FormCatalogListDto,
  ListServicesPageQueryDto,
  ListServicesQueryDto,
  ServiceDetailDto,
  ServiceListDto,
  ServiceVersionDto,
  ServiceWithVersionsDto,
  UpdateVersionDataDto,
} from '../dtos/service.dtos';
import { ServiceVersionsService } from '../services/service-versions.service';
import { ServicesService } from '../services/services.service';

/**
 * `/v1/services` — staff-facing service documents (instances of the seeded Service type).
 * Protected-by-default (session); per-workspace membership authz lives in the service.
 */
@ApiTags('Services')
@Controller({ path: 'services', version: '1' })
export class ServicesV1Controller {
  constructor(
    private readonly services: ServicesService,
    private readonly versions: ServiceVersionsService,
  ) {}

  @Get()
  @ZodSerializerDto(ServiceListDto)
  list(@CurrentUser() user: AuthUser, @Query() query: ListServicesPageQueryDto) {
    return this.services.list(user.id, query);
  }

  @Post()
  @ZodSerializerDto(ServiceWithVersionsDto)
  create(@CurrentUser() user: AuthUser, @Body() body: CreateServiceDto) {
    return this.services.create(user.id, body);
  }

  // Declared before `:id` so the static segments win route matching.
  @Get('definition')
  @ZodSerializerDto(DefinitionDto)
  getDefinition() {
    return this.services.getServiceDefinition();
  }

  @Get('forms')
  @ZodSerializerDto(FormCatalogListDto)
  async listForms(@CurrentUser() user: AuthUser, @Query() query: ListServicesQueryDto) {
    return { items: await this.services.listForms(user.id, query.workspaceId) };
  }

  @Get(':id')
  @ZodSerializerDto(ServiceDetailDto)
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.services.get(user.id, id);
  }

  @Delete(':id')
  @HttpCode(204)
  async removeService(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.services.remove(user.id, id);
  }

  @Post(':id/archive')
  @HttpCode(204)
  async archiveService(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.services.archive(user.id, id);
  }

  @Post(':id/reactivate')
  @HttpCode(204)
  async reactivateService(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.services.reactivate(user.id, id);
  }

  @Patch(':id/versions/:versionId')
  @ZodSerializerDto(ServiceVersionDto)
  updateDraft(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Body() body: UpdateVersionDataDto,
  ) {
    return this.versions.updateDraft(user.id, id, versionId, body);
  }

  @Post(':id/versions/:versionId/publish')
  @ZodSerializerDto(ServiceVersionDto)
  publish(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.versions.publish(user.id, id, versionId);
  }

  @Post(':id/versions/:versionId/archive')
  @ZodSerializerDto(ServiceVersionDto)
  archive(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.versions.archive(user.id, id, versionId);
  }

  @Post(':id/versions')
  @ZodSerializerDto(ServiceVersionDto)
  addVersion(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.versions.addVersion(user.id, id);
  }

  @Delete(':id/versions/:versionId')
  @HttpCode(204)
  async discardVersion(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ): Promise<void> {
    await this.versions.discardVersion(user.id, id, versionId);
  }
}

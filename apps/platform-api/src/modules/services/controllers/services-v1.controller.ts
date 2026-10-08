import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type AuthUser, CurrentUser } from '@repo/nestjs/auth';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  CreateServiceDto,
  DefinitionDto,
  ListServicesPageQueryDto,
  PublishCheckDto,
  ReferenceableServiceListDto,
  ReferenceableServicesQueryDto,
  ServiceDefinitionQueryDto,
  ServiceDetailDto,
  ServiceListDto,
  ServiceVersionDto,
  ServiceWithVersionsDto,
  UpdateVersionContentDto,
} from '../dtos/service.dtos';
import { FormWithVersionDto } from '../../forms/dtos/form.dtos';
import { ReferenceableServicesService } from '../services/referenceable-services.service';
import { ServiceMethodsService } from '../services/service-methods.service';
import { ServiceVersionsService } from '../services/service-versions.service';
import { ServicesService } from '../services/services.service';

/**
 * `/v1/services` — staff-facing service documents (`type = 'services.service'`, feature 217).
 * Protected-by-default (session); per-workspace membership authz lives in the service.
 */
@ApiTags('Services')
@Controller({ path: 'services', version: '1' })
export class ServicesV1Controller {
  constructor(
    private readonly services: ServicesService,
    private readonly versions: ServiceVersionsService,
    private readonly referenceable: ReferenceableServicesService,
    private readonly methods: ServiceMethodsService,
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
  getDefinition(@Query() query: ServiceDefinitionQueryDto) {
    return this.services.getServiceDefinition(query.templateId);
  }

  /** Doc 287: services a document-reference control may link to. Declared before `:id`. */
  @Get('referenceable')
  @ZodSerializerDto(ReferenceableServiceListDto)
  listReferenceable(@CurrentUser() user: AuthUser, @Query() query: ReferenceableServicesQueryDto) {
    return this.referenceable.list(user.id, query);
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
    @Body() body: UpdateVersionContentDto,
  ) {
    return this.versions.updateDraft(user.id, id, versionId, body);
  }

  /** Doc 289: what publishing this version would check — its application methods. */
  @Get(':id/versions/:versionId/publish-check')
  @ZodSerializerDto(PublishCheckDto)
  publishCheck(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.methods.publishCheck(user.id, id, versionId);
  }

  /** Doc 289 rule 16: an application method as this service version uses it (same shape as `GET /v1/forms/:id`). */
  @Get(':id/versions/:versionId/application-methods/:methodId')
  @ZodSerializerDto(FormWithVersionDto)
  applicationMethod(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Param('methodId') methodId: string,
  ) {
    return this.methods.methodFor(user.id, id, versionId, methodId);
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

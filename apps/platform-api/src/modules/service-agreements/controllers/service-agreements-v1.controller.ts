import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type AuthUser, CurrentUser } from '@repo/nestjs/auth';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  CreateServiceAgreementDto,
  ListServiceAgreementsDto,
  ListServiceAgreementsPageDto,
  ServiceAgreementDetailDto,
  ServiceAgreementListDto,
  ServiceAgreementListPageDto,
  ServiceAgreementVersionDto,
  ServiceAgreementWithVersionDto,
  UpdateServiceAgreementDto,
} from '../dtos/service-agreement.dtos';
import { type Actor, ServiceAgreementsService } from '../services/service-agreements.service';

/**
 * `/v1/service-agreements` — staff-facing consent documents (kind 'service-agreement').
 * Protected-by-default (session). Workspace-vs-global authorization is role-aware and lives in
 * the service; the controller only derives the actor's admin flag from the session roles.
 */
@ApiTags('Service Agreements')
@Controller({ path: 'service-agreements', version: '1' })
export class ServiceAgreementsV1Controller {
  constructor(private readonly agreements: ServiceAgreementsService) {}

  @Post()
  @ZodSerializerDto(ServiceAgreementWithVersionDto)
  create(@CurrentUser() user: AuthUser, @Body() body: CreateServiceAgreementDto) {
    return this.agreements.create(this.actor(user), body);
  }

  @Get()
  @ZodSerializerDto(ServiceAgreementListDto)
  async list(@CurrentUser() user: AuthUser, @Query() query: ListServiceAgreementsDto) {
    return { items: await this.agreements.list(this.actor(user), query) };
  }

  // Paginated/searchable browse for the console + admin list surfaces. Declared before `:id` so the
  // static segment wins route matching. The unpaginated `GET /` above still feeds the attach/default
  // pickers (which need the full workspace + global set).
  @Get('page')
  @ZodSerializerDto(ServiceAgreementListPageDto)
  listPage(@CurrentUser() user: AuthUser, @Query() query: ListServiceAgreementsPageDto) {
    return this.agreements.listPage(this.actor(user), query);
  }

  @Get(':id')
  @ZodSerializerDto(ServiceAgreementDetailDto)
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.agreements.get(this.actor(user), id);
  }

  @Patch(':id/versions/:versionId')
  @ZodSerializerDto(ServiceAgreementVersionDto)
  updateDraft(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Body() body: UpdateServiceAgreementDto,
  ) {
    return this.agreements.updateDraft(this.actor(user), id, versionId, body);
  }

  @Post(':id/versions')
  @ZodSerializerDto(ServiceAgreementVersionDto)
  addVersion(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.agreements.addVersion(this.actor(user), id);
  }

  @Post(':id/versions/:versionId/publish')
  @ZodSerializerDto(ServiceAgreementVersionDto)
  publish(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.agreements.publish(this.actor(user), id, versionId);
  }

  private actor(user: AuthUser): Actor {
    return { id: user.id, isAdmin: user.roles.includes('admin') };
  }
}

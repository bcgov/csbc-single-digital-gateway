import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type AuthUser, CurrentUser } from '@repo/nestjs/auth';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  AddDefaultAgreementDto,
  DefaultAgreementDto,
  DefaultAgreementListDto,
} from '../dtos/default-agreement.dtos';
import { DefaultAgreementsService } from '../services/default-agreements.service';

/**
 * `/v1/workspaces/:workspaceId/default-agreements` — a workspace's default service agreements.
 * Protected-by-default (session); per-workspace authz (member read, admin write) lives in the service.
 */
@ApiTags('Default agreements')
@Controller({ path: 'workspaces', version: '1' })
export class DefaultAgreementsV1Controller {
  constructor(private readonly service: DefaultAgreementsService) {}

  @Get(':workspaceId/default-agreements')
  @ZodSerializerDto(DefaultAgreementListDto)
  async list(@CurrentUser() user: AuthUser, @Param('workspaceId') workspaceId: string) {
    return { items: await this.service.list(user.id, workspaceId) };
  }

  @Post(':workspaceId/default-agreements')
  @ZodSerializerDto(DefaultAgreementDto)
  add(
    @CurrentUser() user: AuthUser,
    @Param('workspaceId') workspaceId: string,
    @Body() body: AddDefaultAgreementDto,
  ) {
    return this.service.add(user.id, workspaceId, body.agreementDocumentId);
  }

  @Delete(':workspaceId/default-agreements/:id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.service.remove(user.id, workspaceId, id);
  }
}

import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type AuthUser, CurrentUser } from '@repo/nestjs/auth';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  CreateWorkspaceDto,
  ListWorkspacesQueryDto,
  UpdateWorkspaceDto,
  WorkspaceDto,
  WorkspaceListDto,
  WorkspaceMemberListDto,
} from '../dtos/workspace.dtos';
import { WorkspacesService } from '../services/workspaces.service';

/**
 * `/v1/workspaces` — protected-by-default (session). Requests are validated by the global
 * `ZodValidationPipe` (via the `createZodDto` body/query types); responses are serialized by
 * `@ZodSerializerDto`. Per-workspace authz lives in the service.
 */
@ApiTags('Workspaces')
@Controller({ path: 'workspaces', version: '1' })
export class WorkspacesV1Controller {
  constructor(private readonly service: WorkspacesService) {}

  @Get()
  @ZodSerializerDto(WorkspaceListDto)
  list(@CurrentUser() user: AuthUser, @Query() query: ListWorkspacesQueryDto) {
    return this.service.list(user.id, query);
  }

  @Post()
  @ZodSerializerDto(WorkspaceDto)
  create(@CurrentUser() user: AuthUser, @Body() body: CreateWorkspaceDto) {
    return this.service.create(user.id, body);
  }

  @Get('by-slug/:slug')
  @ZodSerializerDto(WorkspaceDto)
  getBySlug(@CurrentUser() user: AuthUser, @Param('slug') slug: string) {
    return this.service.getBySlug(user.id, slug);
  }

  @Get(':id')
  @ZodSerializerDto(WorkspaceDto)
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.get(user.id, id);
  }

  @Get(':id/members')
  @ZodSerializerDto(WorkspaceMemberListDto)
  listMembers(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.listMembers(user.id, id);
  }

  @Patch(':id')
  @ZodSerializerDto(WorkspaceDto)
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: UpdateWorkspaceDto) {
    return this.service.update(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.service.remove(user.id, id);
  }
}

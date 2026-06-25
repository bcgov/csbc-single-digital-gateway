import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { type AuthUser, CurrentUser } from '@repo/nestjs/auth';
import {
  createWorkspaceSchema,
  listWorkspacesQuerySchema,
  updateWorkspaceSchema,
  type WorkspaceDto,
  type WorkspaceListDto,
  zodParse,
} from '../dtos/workspace.dtos';
import { WorkspacesService } from '../services/workspaces.service';

/** `/v1/workspaces` — protected-by-default (session). Per-workspace authz lives in the service. */
@Controller({ path: 'workspaces', version: '1' })
export class WorkspacesV1Controller {
  constructor(private readonly service: WorkspacesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: unknown): Promise<WorkspaceListDto> {
    return this.service.list(user.id, zodParse(listWorkspacesQuerySchema, query));
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: unknown): Promise<WorkspaceDto> {
    return this.service.create(user.id, zodParse(createWorkspaceSchema, body));
  }

  @Get('by-slug/:slug')
  getBySlug(@CurrentUser() user: AuthUser, @Param('slug') slug: string): Promise<WorkspaceDto> {
    return this.service.getBySlug(user.id, slug);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<WorkspaceDto> {
    return this.service.get(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<WorkspaceDto> {
    return this.service.update(user.id, id, zodParse(updateWorkspaceSchema, body));
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.service.remove(user.id, id);
  }
}

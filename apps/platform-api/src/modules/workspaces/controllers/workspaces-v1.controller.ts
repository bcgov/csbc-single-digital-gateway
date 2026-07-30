import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type AuthUser, CurrentUser } from '@repo/nestjs/auth';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  AddMemberDto,
  AddableStaffQueryDto,
  CreateWorkspaceDto,
  ListMembersQueryDto,
  ListWorkspacesQueryDto,
  StaffUserListDto,
  TransferOwnershipDto,
  UpdateWorkspaceDto,
  UpdateMemberDto,
  WorkspaceDto,
  WorkspaceListDto,
  WorkspaceMemberDto,
  WorkspaceMemberListDto,
  WorkspaceMemberListPageDto,
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

  // Paginated/searchable members browse for the Team page. Declared before nothing conflicting;
  // the unpaginated `GET :id/members` above still feeds the member-detail lookup (full set).
  @Get(':id/members/page')
  @ZodSerializerDto(WorkspaceMemberListPageDto)
  listMembersPage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: ListMembersQueryDto,
  ) {
    return this.service.listMembersPage(user.id, id, query);
  }

  @Get(':id/addable-staff')
  @ZodSerializerDto(StaffUserListDto)
  listAddableStaff(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: AddableStaffQueryDto,
  ) {
    return this.service.listAddableStaff(user.id, id, query);
  }

  @Post(':id/members')
  @ZodSerializerDto(WorkspaceMemberDto)
  addMember(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: AddMemberDto) {
    return this.service.addMember(user.id, id, body);
  }

  @Patch(':id/members/:memberId')
  @HttpCode(204)
  async updateMember(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() body: UpdateMemberDto,
  ): Promise<void> {
    await this.service.updateMember(user.id, id, memberId, body);
  }

  @Post(':id/transfer-ownership')
  @ZodSerializerDto(WorkspaceDto)
  transferOwnership(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: TransferOwnershipDto,
  ) {
    return this.service.transferOwnership(user.id, id, body);
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

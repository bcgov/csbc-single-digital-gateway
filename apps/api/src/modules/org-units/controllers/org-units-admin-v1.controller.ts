import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UsersService } from '../../users/services/users.service';
import {
  AddMemberBodyDto,
  CreateChildOrgUnitBodyDto,
  MemberRemoveParamDto,
  OrgUnitIdParamDto,
  PaginationQueryDto,
  SearchUsersQueryDto,
} from '../dtos/org-unit.dto';
import { OrgUnitAdminGuard } from '../guards/org-unit-admin.guard';
import { OrgUnitsService } from '../services/org-units.service';

@Controller('admin/org-units')
@UseGuards(RolesGuard)
@Roles('admin', 'org-admin')
export class OrgUnitsAdminV1Controller {
  constructor(
    private readonly orgUnitsService: OrgUnitsService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  async findAll(@Query() query: PaginationQueryDto, @Req() req: Request) {
    const userId = req.session?.idir?.userId;
    const roles = userId ? await this.usersService.getUserRoles(userId) : [];
    const isGlobalAdmin = roles.includes('admin');

    return this.orgUnitsService.findAll(query.page, query.limit, {
      userId: userId ?? '',
      isGlobalAdmin,
    });
  }

  @Get(':id')
  findOne(@Param() params: OrgUnitIdParamDto) {
    return this.orgUnitsService.findById(params.id);
  }

  @Get(':id/children')
  getChildren(@Param() params: OrgUnitIdParamDto) {
    return this.orgUnitsService.getChildren(params.id);
  }

  @Get(':id/allowed-child-types')
  getAllowedChildTypes(@Param() params: OrgUnitIdParamDto) {
    return this.orgUnitsService.getAllowedChildTypes(params.id);
  }

  @Post(':id/children')
  @UseGuards(OrgUnitAdminGuard)
  createChild(
    @Param() params: OrgUnitIdParamDto,
    @Body() body: CreateChildOrgUnitBodyDto,
  ) {
    return this.orgUnitsService.createChild(params.id, body.name, body.type);
  }

  @Get(':id/members')
  getMembers(@Param() params: OrgUnitIdParamDto) {
    return this.orgUnitsService.getMembers(params.id);
  }

  @Get(':id/members/search')
  @UseGuards(OrgUnitAdminGuard)
  searchUsers(
    @Param() params: OrgUnitIdParamDto,
    @Query() query: SearchUsersQueryDto,
  ) {
    return this.usersService.searchStaffUsers(query.q, params.id, query.limit);
  }

  @Post(':id/members')
  @UseGuards(OrgUnitAdminGuard)
  addMember(
    @Param() params: OrgUnitIdParamDto,
    @Body() body: AddMemberBodyDto,
  ) {
    return this.orgUnitsService.addMemberById(
      params.id,
      body.userId,
      body.role,
    );
  }

  @Delete(':id/members/:memberId')
  @UseGuards(OrgUnitAdminGuard)
  removeMember(@Param() params: MemberRemoveParamDto) {
    return this.orgUnitsService.removeMember(params.id, params.memberId);
  }

  @Post('sync-ministries')
  syncMinistries() {
    return this.orgUnitsService.syncMinistries();
  }
}

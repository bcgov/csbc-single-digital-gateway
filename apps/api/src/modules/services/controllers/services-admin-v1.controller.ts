import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UsersService } from '../../users/services/users.service';
import { RequiresOwner } from '../decorators/requires-owner.decorator';
import {
  AddContributorBodyDto,
  CreateServiceBodyDto,
  FindAllServicesQueryDto,
  ServiceContributorParamDto,
  ServiceIdParamDto,
  ServiceVersionIdParamDto,
  ServiceVersionLocaleParamDto,
  UpsertServiceTranslationBodyDto,
} from '../dtos/service.dto';
import { ServiceContributorGuard } from '../guards/service-contributor.guard';
import { ServiceContributorsService } from '../services/service-contributors.service';
import { ServicesService } from '../services/services.service';

@Controller('admin/services')
@UseGuards(RolesGuard)
@Roles('admin', 'staff')
export class ServicesAdminV1Controller {
  constructor(
    private readonly servicesService: ServicesService,
    private readonly contributorsService: ServiceContributorsService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  async create(@Body() body: CreateServiceBodyDto, @Req() req: Request) {
    const userId = req.session?.idir?.userId ?? '';
    const isAdmin = await this.isAdmin(req);
    return this.servicesService.create(body, userId, isAdmin);
  }

  @Get()
  async findAll(@Query() query: FindAllServicesQueryDto, @Req() req: Request) {
    const userId = req.session?.idir?.userId ?? '';
    const isAdmin = await this.isAdmin(req);
    return this.servicesService.findAll(
      query.page,
      query.limit,
      {
        orgUnitId: query.orgUnitId,
        serviceTypeId: query.serviceTypeId,
      },
      userId,
      isAdmin,
    );
  }

  @Get(':serviceId')
  @UseGuards(ServiceContributorGuard)
  findOne(@Param() params: ServiceIdParamDto) {
    return this.servicesService.findById(params.serviceId);
  }

  @Post(':serviceId/versions')
  @UseGuards(ServiceContributorGuard)
  createVersion(@Param() params: ServiceIdParamDto) {
    return this.servicesService.createVersion(params.serviceId);
  }

  @Get(':serviceId/versions/:versionId')
  @UseGuards(ServiceContributorGuard)
  getVersion(@Param() params: ServiceVersionIdParamDto) {
    return this.servicesService.getVersion(params.serviceId, params.versionId);
  }

  @Put(':serviceId/versions/:versionId/translations/:locale')
  @UseGuards(ServiceContributorGuard)
  upsertTranslation(
    @Param() params: ServiceVersionLocaleParamDto,
    @Body() body: UpsertServiceTranslationBodyDto,
  ) {
    return this.servicesService.upsertTranslation(
      params.serviceId,
      params.versionId,
      params.locale,
      body,
    );
  }

  @Post(':serviceId/versions/:versionId/publish')
  @UseGuards(ServiceContributorGuard)
  @RequiresOwner()
  publishVersion(@Param() params: ServiceVersionIdParamDto) {
    return this.servicesService.publishVersion(params.serviceId, params.versionId);
  }

  @Post(':serviceId/versions/:versionId/archive')
  @UseGuards(ServiceContributorGuard)
  @RequiresOwner()
  archiveVersion(@Param() params: ServiceVersionIdParamDto) {
    return this.servicesService.archiveVersion(params.serviceId, params.versionId);
  }

  @Get(':serviceId/contributors')
  @UseGuards(ServiceContributorGuard)
  getContributors(@Param() params: ServiceIdParamDto) {
    return this.contributorsService.findByService(params.serviceId);
  }

  @Post(':serviceId/contributors')
  @UseGuards(ServiceContributorGuard)
  @RequiresOwner()
  addContributor(
    @Param() params: ServiceIdParamDto,
    @Body() body: AddContributorBodyDto,
  ) {
    return this.contributorsService.addContributor(
      params.serviceId,
      body.userId,
      body.role,
    );
  }

  @Delete(':serviceId')
  @Roles('admin')
  deleteService(@Param() params: ServiceIdParamDto) {
    return this.servicesService.delete(params.serviceId);
  }

  @Delete(':serviceId/contributors/:userId')
  @UseGuards(ServiceContributorGuard)
  @RequiresOwner()
  removeContributor(@Param() params: ServiceContributorParamDto) {
    return this.contributorsService.removeContributor(
      params.serviceId,
      params.userId,
    );
  }

  private async isAdmin(req: Request): Promise<boolean> {
    const userId = req.session?.idir?.userId;
    if (!userId) return false;
    const roles = await this.usersService.getUserRoles(userId);
    return roles.includes('admin');
  }
}

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
import { IdirRoles } from 'src/common/decorators/idir-roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UsersService } from '../../users/services/users.service';
import { PaginationQueryDto } from '../dtos/common.dto';
import {
  CreateTypeBodyDto,
  TypeIdParamDto,
  TypeVersionIdParamDto,
  TypeVersionLocaleParamDto,
  UpsertTypeVersionTranslationBodyDto,
} from '../dtos/service-type.dto';
import { ServiceTypesService } from '../services/service-types.service';

@Controller('admin/service-types')
@UseGuards(RolesGuard)
@IdirRoles('admin', 'staff')
export class ServiceTypesAdminV1Controller {
  constructor(
    private readonly typesService: ServiceTypesService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @IdirRoles('admin')
  create(@Body() body: CreateTypeBodyDto) {
    return this.typesService.create(body);
  }

  @Get()
  async findAll(@Query() query: PaginationQueryDto, @Req() req: Request) {
    const isAdmin = await this.isAdmin(req);
    return this.typesService.findAll(
      query.page,
      query.limit,
      isAdmin,
      query.search,
    );
  }

  @Get('published')
  findAllPublished(@Query() query: PaginationQueryDto) {
    return this.typesService.findAllPublished(
      query.page,
      query.limit,
      query.search,
    );
  }

  @Get(':typeId')
  async findOne(@Param() params: TypeIdParamDto, @Req() req: Request) {
    const isAdmin = await this.isAdmin(req);
    return this.typesService.findById(params.typeId, isAdmin);
  }

  @Delete(':typeId')
  @IdirRoles('admin')
  delete(@Param() params: TypeIdParamDto) {
    return this.typesService.delete(params.typeId);
  }

  @Post(':typeId/versions')
  @IdirRoles('admin')
  createVersion(@Param() params: TypeIdParamDto) {
    return this.typesService.createVersion(params.typeId);
  }

  @Get(':typeId/versions/:versionId')
  @IdirRoles('admin')
  getVersion(@Param() params: TypeVersionIdParamDto) {
    return this.typesService.getVersion(params.typeId, params.versionId);
  }

  @Put(':typeId/versions/:versionId/translations/:locale')
  @IdirRoles('admin')
  upsertTranslation(
    @Param() params: TypeVersionLocaleParamDto,
    @Body() body: UpsertTypeVersionTranslationBodyDto,
  ) {
    return this.typesService.upsertTranslation(
      params.typeId,
      params.versionId,
      params.locale,
      body,
    );
  }

  @Post(':typeId/versions/:versionId/publish')
  @IdirRoles('admin')
  publishVersion(@Param() params: TypeVersionIdParamDto) {
    return this.typesService.publishVersion(params.typeId, params.versionId);
  }

  @Post(':typeId/versions/:versionId/archive')
  @IdirRoles('admin')
  archiveVersion(@Param() params: TypeVersionIdParamDto) {
    return this.typesService.archiveVersion(params.typeId, params.versionId);
  }

  private async isAdmin(req: Request): Promise<boolean> {
    const userId = req.session?.idir?.userId;
    if (!userId) return false;
    const roles = await this.usersService.getUserRoles(userId);
    return roles.includes('admin');
  }
}

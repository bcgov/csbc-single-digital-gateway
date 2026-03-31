import {
  Body,
  Controller,
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
import { PaginationQueryDto } from '../dtos/common.dto';
import {
  CreateTypeBodyDto,
  TypeIdParamDto,
  TypeVersionIdParamDto,
  TypeVersionLocaleParamDto,
  UpsertTypeVersionTranslationBodyDto,
} from '../dtos/consent-document-type.dto';
import { ConsentDocumentTypesService } from '../services/consent-document-types.service';

@Controller('admin/consent/document-types')
@UseGuards(RolesGuard)
@Roles('admin', 'staff')
export class ConsentDocumentTypesAdminV1Controller {
  constructor(
    private readonly typesService: ConsentDocumentTypesService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @Roles('admin')
  create(@Body() body: CreateTypeBodyDto) {
    return this.typesService.create(body);
  }

  @Get()
  async findAll(@Query() query: PaginationQueryDto, @Req() req: Request) {
    const isAdmin = await this.isAdmin(req);
    return this.typesService.findAll(query.page, query.limit, isAdmin);
  }

  @Get(':typeId')
  async findOne(@Param() params: TypeIdParamDto, @Req() req: Request) {
    const isAdmin = await this.isAdmin(req);
    return this.typesService.findById(params.typeId, isAdmin);
  }

  @Post(':typeId/versions')
  @Roles('admin')
  createVersion(@Param() params: TypeIdParamDto) {
    return this.typesService.createVersion(params.typeId);
  }

  @Get(':typeId/versions/:versionId')
  @Roles('admin')
  getVersion(@Param() params: TypeVersionIdParamDto) {
    return this.typesService.getVersion(params.typeId, params.versionId);
  }

  @Put(':typeId/versions/:versionId/translations/:locale')
  @Roles('admin')
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
  @Roles('admin')
  publishVersion(@Param() params: TypeVersionIdParamDto) {
    return this.typesService.publishVersion(params.typeId, params.versionId);
  }

  @Post(':typeId/versions/:versionId/archive')
  @Roles('admin')
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

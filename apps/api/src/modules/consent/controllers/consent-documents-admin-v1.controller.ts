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
  CreateDocBodyDto,
  DocContributorParamDto,
  DocIdParamDto,
  DocVersionIdParamDto,
  DocVersionLocaleParamDto,
  FindAllDocsQueryDto,
  UpsertDocTranslationBodyDto,
} from '../dtos/consent-document.dto';
import { ConsentDocumentContributorGuard } from '../guards/consent-document-contributor.guard';
import { ConsentDocumentContributorsService } from '../services/consent-document-contributors.service';
import { ConsentDocumentsService } from '../services/consent-documents.service';

@Controller('admin/consent/documents')
@UseGuards(RolesGuard)
@Roles('admin', 'staff')
export class ConsentDocumentsAdminV1Controller {
  constructor(
    private readonly documentsService: ConsentDocumentsService,
    private readonly contributorsService: ConsentDocumentContributorsService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  async create(@Body() body: CreateDocBodyDto, @Req() req: Request) {
    const userId = req.session?.idir?.userId ?? '';
    const isAdmin = await this.isAdmin(req);
    return this.documentsService.create(body, userId, isAdmin);
  }

  @Get()
  async findAll(@Query() query: FindAllDocsQueryDto, @Req() req: Request) {
    const userId = req.session?.idir?.userId ?? '';
    const isAdmin = await this.isAdmin(req);
    return this.documentsService.findAll(
      query.page,
      query.limit,
      {
        orgUnitId: query.orgUnitId,
        consentDocumentTypeId: query.consentDocumentTypeId,
      },
      userId,
      isAdmin,
    );
  }

  @Get(':docId')
  @UseGuards(ConsentDocumentContributorGuard)
  findOne(@Param() params: DocIdParamDto) {
    return this.documentsService.findById(params.docId);
  }

  @Post(':docId/versions')
  @UseGuards(ConsentDocumentContributorGuard)
  createVersion(@Param() params: DocIdParamDto) {
    return this.documentsService.createVersion(params.docId);
  }

  @Get(':docId/versions/:versionId')
  @UseGuards(ConsentDocumentContributorGuard)
  getVersion(@Param() params: DocVersionIdParamDto) {
    return this.documentsService.getVersion(params.docId, params.versionId);
  }

  @Put(':docId/versions/:versionId/translations/:locale')
  @UseGuards(ConsentDocumentContributorGuard)
  upsertTranslation(
    @Param() params: DocVersionLocaleParamDto,
    @Body() body: UpsertDocTranslationBodyDto,
  ) {
    return this.documentsService.upsertTranslation(
      params.docId,
      params.versionId,
      params.locale,
      body,
    );
  }

  @Post(':docId/versions/:versionId/publish')
  @UseGuards(ConsentDocumentContributorGuard)
  @RequiresOwner()
  publishVersion(@Param() params: DocVersionIdParamDto) {
    return this.documentsService.publishVersion(params.docId, params.versionId);
  }

  @Post(':docId/versions/:versionId/archive')
  @UseGuards(ConsentDocumentContributorGuard)
  @RequiresOwner()
  archiveVersion(@Param() params: DocVersionIdParamDto) {
    return this.documentsService.archiveVersion(params.docId, params.versionId);
  }

  @Get(':docId/contributors')
  @UseGuards(ConsentDocumentContributorGuard)
  getContributors(@Param() params: DocIdParamDto) {
    return this.contributorsService.findByDocument(params.docId);
  }

  @Post(':docId/contributors')
  @UseGuards(ConsentDocumentContributorGuard)
  @RequiresOwner()
  addContributor(
    @Param() params: DocIdParamDto,
    @Body() body: AddContributorBodyDto,
  ) {
    return this.contributorsService.addContributor(
      params.docId,
      body.userId,
      body.role,
    );
  }

  @Delete(':docId')
  @Roles('admin')
  deleteDocument(@Param() params: DocIdParamDto) {
    return this.documentsService.delete(params.docId);
  }

  @Delete(':docId/contributors/:userId')
  @UseGuards(ConsentDocumentContributorGuard)
  @RequiresOwner()
  removeContributor(@Param() params: DocContributorParamDto) {
    return this.contributorsService.removeContributor(
      params.docId,
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

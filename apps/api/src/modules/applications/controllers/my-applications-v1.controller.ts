import {
  Controller,
  Get,
  Header,
  Param,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { BcscRoles } from 'src/common/decorators/bcsc-roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import {
  ApplicationIdParamDto,
  ListApplicationsQueryDto,
} from '../dtos/application.dto';
import { ApplicationsService } from '../services/applications.service';
import { WorkflowActorClientService } from '../services/workflow-actor-client.service';

@Controller({
  path: 'me/applications',
  version: '1',
})
export class MyApplicationsV1Controller {
  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly workflowActorClient: WorkflowActorClientService,
  ) {}

  @Get()
  @UseGuards(RolesGuard)
  @BcscRoles('citizen')
  async listForUser(
    @Query() query: ListApplicationsQueryDto,
    @Req() req: Request,
  ) {
    const userId = req.session?.bcsc?.userId;
    if (!userId) {
      throw new UnauthorizedException('Active BCSC session required');
    }

    return this.applicationsService.listForUser({
      userId,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':applicationId')
  @UseGuards(RolesGuard)
  @BcscRoles('citizen')
  async findOne(
    @Param() params: ApplicationIdParamDto,
    @Req() req: Request,
  ) {
    const userId = req.session?.bcsc?.userId;
    if (!userId) {
      throw new UnauthorizedException('Active BCSC session required');
    }

    return this.applicationsService.findOneForUser({
      userId,
      applicationId: params.applicationId,
    });
  }

  @Get(':applicationId/actions')
  @UseGuards(RolesGuard)
  @BcscRoles('citizen')
  @Header('Cache-Control', 'no-store')
  async getActions(
    @Param() params: ApplicationIdParamDto,
    @Req() req: Request,
  ) {
    const ctx = await this.resolveActorContext(req, params.applicationId);
    return this.workflowActorClient.fetchActions(ctx);
  }

  @Get(':applicationId/messages')
  @UseGuards(RolesGuard)
  @BcscRoles('citizen')
  @Header('Cache-Control', 'no-store')
  async getMessages(
    @Param() params: ApplicationIdParamDto,
    @Req() req: Request,
  ) {
    const ctx = await this.resolveActorContext(req, params.applicationId);
    return this.workflowActorClient.fetchMessages(ctx);
  }

  private async resolveActorContext(req: Request, applicationId: string) {
    const userId = req.session?.bcsc?.userId;
    const userProfile = req.session?.bcsc?.userProfile;
    if (!userId || !userProfile) {
      throw new UnauthorizedException('Active BCSC session required');
    }
    return this.applicationsService.getActorReadContext({
      userId,
      userProfile,
      applicationId,
    });
  }
}

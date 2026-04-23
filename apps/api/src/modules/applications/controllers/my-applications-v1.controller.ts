import {
  Controller,
  Get,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { BcscRoles } from 'src/common/decorators/bcsc-roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { ListApplicationsQueryDto } from '../dtos/application.dto';
import { ApplicationsService } from '../services/applications.service';

@Controller({
  path: 'me/applications',
  version: '1',
})
export class MyApplicationsV1Controller {
  constructor(private readonly applicationsService: ApplicationsService) {}

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
}

import {
  Controller,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { BcscRoles } from 'src/common/decorators/bcsc-roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import {
  SubmitApplicationParamDto,
  SubmitApplicationQueryDto,
} from '../dtos/application.dto';
import { ApplicationsService } from '../services/applications.service';

@Controller({
  path: 'services',
  version: '1',
})
export class ApplicationsV1Controller {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post(':serviceId/versions/:versionId/apply/:applicationId')
  @UseGuards(RolesGuard)
  @BcscRoles('citizen')
  async submit(
    @Param() params: SubmitApplicationParamDto,
    @Query() query: SubmitApplicationQueryDto,
    @Req() req: Request,
  ) {
    const userId = req.session?.bcsc?.userId;
    const profile = req.session?.bcsc?.userProfile;

    if (!userId || !profile) {
      throw new UnauthorizedException('Active BCSC session required');
    }

    return this.applicationsService.submit({
      serviceId: params.serviceId,
      versionId: params.versionId,
      applicationId: params.applicationId,
      locale: query.locale,
      userId,
      profile: {
        sub: profile.sub,
        name: profile.name,
        given_name: profile.given_name,
        family_name: profile.family_name,
      },
    });
  }
}

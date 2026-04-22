import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { BcscRoles } from 'src/common/decorators/bcsc-roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { PublicRoute } from '../../auth/decorators/public-route.decorator';
import {
  PublicServiceDetailQueryDto,
  PublicServiceListQueryDto,
} from '../dtos/public-service.dto';
import {
  ServiceIdParamDto,
  ServiceVersionIdParamDto,
} from '../dtos/service.dto';
import { ServicesService } from '../services/services.service';

@Controller({
  path: 'services',
  version: '1',
})
export class ServicesV1Controller {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @PublicRoute()
  findAll(@Query() query: PublicServiceListQueryDto) {
    return this.servicesService.findAllPublished(
      query.page,
      query.limit,
      query.locale,
      {
        serviceTypeId: query.serviceTypeId,
        orgUnitId: query.orgUnitId,
        search: query.search,
      },
    );
  }

  @Get(':serviceId')
  @PublicRoute()
  findOne(
    @Param() params: ServiceIdParamDto,
    @Query() query: PublicServiceDetailQueryDto,
  ) {
    return this.servicesService.findOnePublished(
      params.serviceId,
      query.locale,
    );
  }

  @Get(':serviceId/versions/:versionId')
  @UseGuards(RolesGuard)
  @BcscRoles('citizen')
  findOneVersion(
    @Param() params: ServiceVersionIdParamDto,
    @Query() query: PublicServiceDetailQueryDto,
  ) {
    return this.servicesService.findOneVersion(
      params.serviceId,
      params.versionId,
      query.locale,
    );
  }
}

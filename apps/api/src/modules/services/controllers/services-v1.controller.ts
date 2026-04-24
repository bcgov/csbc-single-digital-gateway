import {
  Controller,
  Get,
  Header,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BcscRoles } from 'src/common/decorators/bcsc-roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { PublicRoute } from '../../auth/decorators/public-route.decorator';
import {
  ApplicationProcessParamDto,
  ApplicationProcessQueryDto,
  type ApplicationProcessResponse,
} from '../dtos/application-process.dto';
import {
  PublicServiceDetailQueryDto,
  PublicServiceListQueryDto,
} from '../dtos/public-service.dto';
import {
  ServiceIdParamDto,
  ServiceVersionIdParamDto,
} from '../dtos/service.dto';
import { ServicesService } from '../services/services.service';
import { WorkflowProcessService } from '../services/workflow-process.service';

@Controller({
  path: 'services',
  version: '1',
})
export class ServicesV1Controller {
  constructor(
    private readonly servicesService: ServicesService,
    private readonly workflowProcessService: WorkflowProcessService,
  ) {}

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

  @Get(':serviceId/versions/:versionId/application-process')
  @PublicRoute()
  @Header('Cache-Control', 'no-store')
  async getApplicationProcess(
    @Param() params: ApplicationProcessParamDto,
    @Query() query: ApplicationProcessQueryDto,
  ): Promise<ApplicationProcessResponse> {
    const config = await this.servicesService.resolveWorkflowApplicationConfig({
      serviceId: params.serviceId,
      versionId: params.versionId,
      applicationId: query.applicationId,
      locale: query.locale,
    });

    const result = await this.workflowProcessService.fetch({
      apiKey: config.apiKey,
      tenantId: config.tenantId,
      workflowId: config.workflowId,
    });

    return {
      applicationId: query.applicationId,
      workflowId: result.workflowId,
      name: result.name,
      steps: result.steps,
    };
  }
}

import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type AuthUser, CurrentUser } from '@repo/nestjs/auth';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  ServiceAgreementDetailDto,
  ServiceAgreementListDto,
} from '../dtos/service-agreements.dtos';
import { ServiceAgreementsService } from '../services/service-agreements.service';

/**
 * `/v1/me/service-agreements` — the signed-in citizen's approved-agreement history (feature 139).
 * Protected-by-default (the global AuthGuard 401s without a session); every operation is scoped to
 * `@CurrentUser`. Read-only over the append-only consent audit.
 */
@ApiTags('Me')
@Controller({ path: 'me/service-agreements', version: '1' })
export class MyServiceAgreementsV1Controller {
  constructor(private readonly service: ServiceAgreementsService) {}

  @Get()
  @ZodSerializerDto(ServiceAgreementListDto)
  async list(@CurrentUser() user: AuthUser) {
    return { items: await this.service.listMine(user.id) };
  }

  @Get(':id')
  @ZodSerializerDto(ServiceAgreementDetailDto)
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getMine(user.id, id);
  }
}

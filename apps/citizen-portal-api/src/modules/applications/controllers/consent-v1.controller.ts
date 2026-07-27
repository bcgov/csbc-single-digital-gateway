import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type AuthUser, CurrentUser } from '@repo/nestjs/auth';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  ConsentAckDto,
  RecordConsentDto,
  ServiceAgreementConsentListDto,
} from '../dtos/consent.dtos';
import { ConsentService } from '../services/consent.service';

/** `/v1/me/*` — the citizen's service-agreement consent (auth; scoped to `@CurrentUser`). */
@ApiTags('Consent')
@Controller({ path: 'me', version: '1' })
export class ConsentV1Controller {
  constructor(private readonly consent: ConsentService) {}

  @Get('services/:serviceId/agreements')
  @ZodSerializerDto(ServiceAgreementConsentListDto)
  async agreements(@CurrentUser() user: AuthUser, @Param('serviceId') serviceId: string) {
    return { items: await this.consent.agreementsForService(user.id, serviceId) };
  }

  @Post('agreement-consents')
  @ZodSerializerDto(ConsentAckDto)
  record(@CurrentUser() user: AuthUser, @Body() body: RecordConsentDto) {
    return this.consent.record(user.id, body.agreementVersionId, body.decision);
  }
}

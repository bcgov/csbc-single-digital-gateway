import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type AuthUser, CurrentUser } from '@repo/nestjs/auth';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  ApplicationDetailDto,
  CreateSubmissionDto,
  MyApplicationListDto,
  SubmissionDataDto,
  SubmissionDto,
} from '../dtos/application.dtos';
import { ApplicationsService } from '../services/applications.service';

/**
 * `/v1/me/applications` — the signed-in citizen's applications. Protected-by-default (the global
 * AuthGuard 401s without a session); every operation is scoped to `@CurrentUser`. Creation takes the
 * `formVersionId` in the body (the service/form context is data, not a path) — see feature 63 notes.
 */
@ApiTags('Me')
@Controller({ path: 'me', version: '1' })
export class MyApplicationsV1Controller {
  constructor(private readonly applications: ApplicationsService) {}

  @Get('applications')
  @ZodSerializerDto(MyApplicationListDto)
  async list(@CurrentUser() user: AuthUser) {
    return { items: await this.applications.listMine(user.id) };
  }

  @Post('applications')
  @ZodSerializerDto(SubmissionDto)
  create(@CurrentUser() user: AuthUser, @Body() body: CreateSubmissionDto) {
    return this.applications.createOrResumeDraft(user.id, body.formVersionId);
  }

  @Get('applications/:id')
  @ZodSerializerDto(ApplicationDetailDto)
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.applications.getDetail(user.id, id);
  }

  @Patch('applications/:id')
  @ZodSerializerDto(SubmissionDto)
  save(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: SubmissionDataDto) {
    return this.applications.saveDraft(user.id, id, body.data);
  }

  @Post('applications/:id/submit')
  @ZodSerializerDto(SubmissionDto)
  submit(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: SubmissionDataDto) {
    return this.applications.submit(user.id, id, body.data);
  }

  @Post('applications/:id/revise')
  @ZodSerializerDto(SubmissionDto)
  revise(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.applications.revise(user.id, id);
  }
}

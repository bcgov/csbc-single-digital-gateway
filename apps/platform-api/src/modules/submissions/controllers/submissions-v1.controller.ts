import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type AuthUser, CurrentUser } from '@repo/nestjs/auth';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  ListSubmissionsQueryDto,
  ReviewSubmissionDto,
  SubmissionDetailDto,
  SubmissionListDto,
} from '../dtos/submission.dtos';
import { SubmissionsService } from '../services/submissions.service';

/**
 * `/v1/submissions` — staff review of citizens' submissions. Protected-by-default (session);
 * per-workspace membership authz lives in the service (404 for non-members).
 */
@ApiTags('Submissions')
@Controller({ path: 'submissions', version: '1' })
export class SubmissionsV1Controller {
  constructor(private readonly submissions: SubmissionsService) {}

  @Get()
  @ZodSerializerDto(SubmissionListDto)
  async list(@CurrentUser() user: AuthUser, @Query() query: ListSubmissionsQueryDto) {
    return { items: await this.submissions.list(user.id, query) };
  }

  @Get(':id')
  @ZodSerializerDto(SubmissionDetailDto)
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.submissions.get(user.id, id);
  }

  @Post(':id/review')
  @ZodSerializerDto(SubmissionDetailDto)
  review(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: ReviewSubmissionDto,
  ) {
    return this.submissions.review(user.id, id, body);
  }
}

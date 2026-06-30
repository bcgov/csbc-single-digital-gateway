import { Module } from '@nestjs/common';
import { SubmissionsV1Controller } from './controllers/submissions-v1.controller';
import { SubmissionsService } from './services/submissions.service';

/** Staff submissions review (feature 65): list a workspace's submissions, read one, record reviews. */
@Module({
  controllers: [SubmissionsV1Controller],
  providers: [SubmissionsService],
})
export class SubmissionsModule {}

import { Module } from '@nestjs/common';

import { NotificationsV1Controller } from './controllers/notifications-v1.controller';
import { IngestionService } from './services/ingestion.service';

@Module({
  controllers: [NotificationsV1Controller],
  providers: [IngestionService],
  exports: [IngestionService],
})
export class NotificationsModule {}

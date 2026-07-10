import { Module } from '@nestjs/common';

import { FeedV1Controller } from './controllers/feed-v1.controller';
import { PreferencesV1Controller } from './controllers/preferences-v1.controller';
import { FeedService } from './services/feed.service';
import { PreferencesService } from './services/preferences.service';

@Module({
  controllers: [PreferencesV1Controller, FeedV1Controller],
  providers: [PreferencesService, FeedService],
  exports: [PreferencesService, FeedService],
})
export class RecipientsModule {}

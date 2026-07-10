import { Module } from '@nestjs/common';

import { PreferencesV1Controller } from './controllers/preferences-v1.controller';
import { PreferencesService } from './services/preferences.service';

@Module({
  controllers: [PreferencesV1Controller],
  providers: [PreferencesService],
  exports: [PreferencesService],
})
export class RecipientsModule {}

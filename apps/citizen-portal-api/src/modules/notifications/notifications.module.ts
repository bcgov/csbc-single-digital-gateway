import { Module } from '@nestjs/common';

import { MyNotificationsV1Controller } from './controllers/my-notifications-v1.controller';
import { NotificationsProxyService } from './services/notifications-proxy.service';

@Module({
  controllers: [MyNotificationsV1Controller],
  providers: [NotificationsProxyService],
})
export class NotificationsModule {}

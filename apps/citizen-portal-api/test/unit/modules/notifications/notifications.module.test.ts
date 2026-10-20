import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { NotificationsModule } from '../../../../src/modules/notifications/notifications.module';
import { MyNotificationsV1Controller } from '../../../../src/modules/notifications/controllers/my-notifications-v1.controller';
import { NotificationsProxyService } from '../../../../src/modules/notifications/services/notifications-proxy.service';
import { createMockConfigService } from '../../../utils/create-mock-config-service';

describe('NotificationsModule Unit Test Suite', () => {
  it('Should compile NotificationsModule successfully and resolve all controllers and providers', async () => {
    @Global()
    @Module({
      providers: [
        {
          provide: ConfigService,
          useValue: createMockConfigService(),
        },
      ],
      exports: [ConfigService],
    })
    class MockConfigModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [MockConfigModule, NotificationsModule],
    }).compile();

    expect(moduleRef).toBeDefined();

    // Verify controllers are properly instantiated
    const controller = moduleRef.get(MyNotificationsV1Controller);
    expect(controller).toBeDefined();

    // Verify service is properly instantiated
    const service = moduleRef.get(NotificationsProxyService);
    expect(service).toBeDefined();

    await moduleRef.close();
  });

  it('Should verify metadata declaration directly for NotificationsModule', () => {
    const controllers = Reflect.getMetadata('controllers', NotificationsModule) as any[];
    const providers = Reflect.getMetadata('providers', NotificationsModule) as any[];

    expect(controllers).toBeDefined();
    expect(controllers).toContain(MyNotificationsV1Controller);
    expect(controllers).toHaveLength(1);

    expect(providers).toBeDefined();
    expect(providers).toContain(NotificationsProxyService);
    expect(providers).toHaveLength(1);
  });
});

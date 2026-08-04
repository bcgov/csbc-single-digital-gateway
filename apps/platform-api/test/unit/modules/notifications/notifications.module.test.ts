import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsModule } from '../../../../src/modules/notifications/notifications.module';
import { MyNotificationsV1Controller } from '../../../../src/modules/notifications/controllers/my-notifications-v1.controller';
import { NotificationsProxyService } from '../../../../src/modules/notifications/services/notifications-proxy.service';

describe('NotificationsModule Unit Test Suite', () => {
  it('should compile NotificationsModule successfully and resolve all controllers and providers', async () => {
    @Global()
    @Module({
      providers: [
        {
          provide: ConfigService,
          useValue: { get: vi.fn() },
        },
      ],
      exports: [ConfigService],
    })
    class MockConfigModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [MockConfigModule, NotificationsModule],
    }).compile();

    expect(moduleRef).toBeDefined();

    // Verify controllers
    expect(moduleRef.get(MyNotificationsV1Controller)).toBeDefined();

    // Verify services
    expect(moduleRef.get(NotificationsProxyService)).toBeDefined();

    await moduleRef.close();
  });

  it('should verify metadata declaration directly', () => {
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

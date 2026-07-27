import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DATABASE_CLIENT } from '@repo/nestjs/database';

import { OutboxRelayModule } from '../../../src/notifications/outbox-relay.module';
import { OutboxRelayService } from '../../../src/notifications/outbox-relay.service';

describe('OutboxRelayModule Unit Tests', () => {
  it('should compile OutboxRelayModule successfully and resolve OutboxRelayService', async () => {
    const mockDb = {};
    const mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'NOTIFICATIONS_M2M_ISSUER') return 'http://auth.issuer';
        if (key === 'NOTIFICATIONS_M2M_CLIENT_ID') return 'client-id';
        if (key === 'NOTIFICATIONS_M2M_CLIENT_SECRET') return 'client-secret';
        if (key === 'NOTIFICATION_SERVICE_URL') return 'http://notification.service';
        return undefined;
      }),
    };

    @Global()
    @Module({
      providers: [
        {
          provide: DATABASE_CLIENT,
          useValue: mockDb,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
      exports: [DATABASE_CLIENT, ConfigService],
    })
    class MockDependenciesModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [MockDependenciesModule, OutboxRelayModule],
    }).compile();

    expect(moduleRef).toBeDefined();

    // Verify OutboxRelayService is properly resolved
    const service = moduleRef.get(OutboxRelayService);
    expect(service).toBeDefined();

    await moduleRef.close();
  });

  it('should verify metadata declaration directly', () => {
    const providers = Reflect.getMetadata('providers', OutboxRelayModule) as any[];
    const exports = Reflect.getMetadata('exports', OutboxRelayModule) as any[];

    expect(providers).toBeDefined();
    expect(providers).toContain(OutboxRelayService);
    expect(providers).toHaveLength(1);

    expect(exports).toBeDefined();
    expect(exports).toContain(OutboxRelayService);
    expect(exports).toHaveLength(1);
  });
});

import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DATABASE_CLIENT } from '@repo/nestjs/database';
import { OutboxRelayModule } from '../../../src/notifications/outbox-relay.module';
import { OutboxRelayService } from '../../../src/notifications/outbox-relay.service';
import { createMockConfigService } from '../../utils/createMockConfigService';

describe('OutboxRelayModule Unit Test Suite', () => {
  it('Should compile OutboxRelayModule successfully and resolve OutboxRelayService', async () => {
    const mockDbClient = {}; // mock database client
    @Global()
    @Module({
      providers: [
        {
          provide: DATABASE_CLIENT,
          useValue: mockDbClient,
        },
        {
          provide: ConfigService,
          useValue: createMockConfigService(),
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

  it('Should verify metadata declaration directly', () => {
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

import { describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OutboxRelayModule } from '../../../src/notifications/outbox-relay.module';
import { OutboxRelayService } from '../../../src/notifications/outbox-relay.service';
import { InjectDatabase } from '@repo/nestjs/database';

describe('OutboxRelayModule', () => {
  it('should compile successfully', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [OutboxRelayModule],
    })
      .useMocker((token) => {
        if (token === InjectDatabase() || token === 'Database') {
          return {};
        }
        if (token === ConfigService) {
          return {
            get: (key: string) => {
              if (key === 'NOTIFICATIONS_M2M_ISSUER') return 'http://localhost/auth';
              if (key === 'NOTIFICATIONS_M2M_CLIENT_ID') return 'client';
              if (key === 'NOTIFICATIONS_M2M_CLIENT_SECRET') return 'secret';
              if (key === 'NOTIFICATIONS_SERVICE_URL') return 'http://localhost';
              return '';
            },
          };
        }
        return {};
      })
      .compile();

    expect(moduleRef).toBeDefined();
    expect(moduleRef.get(OutboxRelayService)).toBeInstanceOf(OutboxRelayService);
  });
});

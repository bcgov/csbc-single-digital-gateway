import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { Module, Global } from '@nestjs/common';
import { DATABASE_CLIENT } from '@repo/nestjs/database';
import { DefaultAgreementsModule } from '../../../../src/modules/default-agreements/default-agreements.module';
import { DefaultAgreementsV1Controller } from '../../../../src/modules/default-agreements/controllers/default-agreements-v1.controller';
import { DefaultAgreementsService } from '../../../../src/modules/default-agreements/services/default-agreements.service';

describe('DefaultAgreementsModule Unit Test Suite', () => {
  it('should compile DefaultAgreementsModule successfully and resolve all controllers and providers', async () => {
    const mockDbClient = {}; // mock database client

    @Global()
    @Module({
      providers: [
        {
          provide: DATABASE_CLIENT,
          useValue: mockDbClient,
        },
      ],
      exports: [DATABASE_CLIENT],
    })
    class MockDatabaseModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [MockDatabaseModule, DefaultAgreementsModule],
    }).compile();

    expect(moduleRef).toBeDefined();

    // Verify controllers
    expect(moduleRef.get(DefaultAgreementsV1Controller)).toBeDefined();

    // Verify services
    expect(moduleRef.get(DefaultAgreementsService)).toBeDefined();

    await moduleRef.close();
  });

  it('should verify metadata declaration directly', () => {
    const controllers = Reflect.getMetadata('controllers', DefaultAgreementsModule) as any[];
    const providers = Reflect.getMetadata('providers', DefaultAgreementsModule) as any[];

    expect(controllers).toBeDefined();
    expect(controllers).toContain(DefaultAgreementsV1Controller);
    expect(controllers).toHaveLength(1);

    expect(providers).toBeDefined();
    expect(providers).toContain(DefaultAgreementsService);
    expect(providers).toHaveLength(1);
  });
});

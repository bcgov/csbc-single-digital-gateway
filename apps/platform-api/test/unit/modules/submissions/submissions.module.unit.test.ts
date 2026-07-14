import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { Module, Global } from '@nestjs/common';
import { DATABASE_CLIENT } from '@repo/nestjs/database';
import { SubmissionsModule } from '../../../../src/modules/submissions/submissions.module';
import { SubmissionsV1Controller } from '../../../../src/modules/submissions/controllers/submissions-v1.controller';
import { SubmissionsService } from '../../../../src/modules/submissions/services/submissions.service';

describe('SubmissionsModule Unit Tests', () => {
  it('should compile SubmissionsModule successfully and resolve all controllers and providers', async () => {
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
      imports: [MockDatabaseModule, SubmissionsModule],
    }).compile();

    expect(moduleRef).toBeDefined();

    // Verify controllers
    expect(moduleRef.get(SubmissionsV1Controller)).toBeDefined();

    // Verify services
    expect(moduleRef.get(SubmissionsService)).toBeDefined();

    await moduleRef.close();
  });

  it('should verify metadata declaration directly', () => {
    const controllers = Reflect.getMetadata('controllers', SubmissionsModule) as any[];
    const providers = Reflect.getMetadata('providers', SubmissionsModule) as any[];

    expect(controllers).toBeDefined();
    expect(controllers).toContain(SubmissionsV1Controller);
    expect(controllers).toHaveLength(1);

    expect(providers).toBeDefined();
    expect(providers).toContain(SubmissionsService);
    expect(providers).toHaveLength(1);
  });
});

import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { Module, Global } from '@nestjs/common';
import { DATABASE_CLIENT } from '@repo/nestjs/database';
import { FormsModule } from '../../../../src/modules/forms/forms.module';
import { FormsV1Controller } from '../../../../src/modules/forms/controllers/forms-v1.controller';
import { FormsService } from '../../../../src/modules/forms/services/forms.service';

describe('FormsModule Unit Test Suite', () => {
  it('should compile FormsModule successfully and resolve all controllers and providers', async () => {
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
      imports: [MockDatabaseModule, FormsModule],
    }).compile();

    expect(moduleRef).toBeDefined();

    // Verify controllers are properly instantiated
    const controller = moduleRef.get(FormsV1Controller);
    expect(controller).toBeDefined();

    // Verify services are properly instantiated
    const service = moduleRef.get(FormsService);
    expect(service).toBeDefined();

    await moduleRef.close();
  });

  it('should verify metadata declaration directly', () => {
    const controllers = Reflect.getMetadata('controllers', FormsModule) as any[];
    const providers = Reflect.getMetadata('providers', FormsModule) as any[];

    expect(controllers).toBeDefined();
    expect(controllers).toContain(FormsV1Controller);
    expect(controllers).toHaveLength(1);

    expect(providers).toBeDefined();
    expect(providers).toContain(FormsService);
    expect(providers).toHaveLength(1);
  });
});

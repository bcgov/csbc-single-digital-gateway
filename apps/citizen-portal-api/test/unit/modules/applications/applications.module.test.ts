import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DATABASE_CLIENT } from '@repo/nestjs/database';
import { ApplicationsModule } from '../../../../src/modules/applications/applications.module';
import { MyApplicationsV1Controller } from '../../../../src/modules/applications/controllers/my-applications-v1.controller';
import { ApplicationsService } from '../../../../src/modules/applications/services/applications.service';

describe('ApplicationsModule Unit Test Suite', () => {
  it('should compile ApplicationsModule successfully and resolve all controllers and providers', async () => {
    const mockDbClient = {}; // mock database client
    const mockConfigService = {
      get: vi.fn(),
    };

    @Global()
    @Module({
      providers: [
        {
          provide: DATABASE_CLIENT,
          useValue: mockDbClient,
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
      imports: [MockDependenciesModule, ApplicationsModule],
    }).compile();

    expect(moduleRef).toBeDefined();

    // Verify controllers are properly instantiated
    const myController = moduleRef.get(MyApplicationsV1Controller);
    expect(myController).toBeDefined();

    // Verify services are properly instantiated
    const service = moduleRef.get(ApplicationsService);
    expect(service).toBeDefined();

    await moduleRef.close();
  });

  it('should verify metadata declaration directly', () => {
    const controllers = Reflect.getMetadata('controllers', ApplicationsModule) as any[];
    const providers = Reflect.getMetadata('providers', ApplicationsModule) as any[];

    expect(controllers).toBeDefined();
    expect(controllers).toContain(MyApplicationsV1Controller);
    expect(controllers).toHaveLength(1);

    expect(providers).toBeDefined();
    expect(providers).toContain(ApplicationsService);
    expect(providers).toHaveLength(1);
  });
});

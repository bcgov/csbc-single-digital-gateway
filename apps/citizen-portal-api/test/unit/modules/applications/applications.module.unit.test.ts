import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DATABASE_CLIENT } from '@repo/nestjs/database';
import { ApplicationsModule } from '../../../../src/modules/applications/applications.module';
import { ApplicationFormsV1Controller } from '../../../../src/modules/applications/controllers/application-forms-v1.controller';
import { MyApplicationsV1Controller } from '../../../../src/modules/applications/controllers/my-applications-v1.controller';
import { ConsentV1Controller } from '../../../../src/modules/applications/controllers/consent-v1.controller';
import { ApplicationsService } from '../../../../src/modules/applications/services/applications.service';
import { ConsentService } from '../../../../src/modules/applications/services/consent.service';

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
    const formController = moduleRef.get(ApplicationFormsV1Controller);
    const myController = moduleRef.get(MyApplicationsV1Controller);
    const consentController = moduleRef.get(ConsentV1Controller);
    expect(formController).toBeDefined();
    expect(myController).toBeDefined();
    expect(consentController).toBeDefined();

    // Verify services are properly instantiated
    const service = moduleRef.get(ApplicationsService);
    const consentService = moduleRef.get(ConsentService);
    expect(service).toBeDefined();
    expect(consentService).toBeDefined();

    await moduleRef.close();
  });

  it('should verify metadata declaration directly', () => {
    const controllers = Reflect.getMetadata('controllers', ApplicationsModule) as any[];
    const providers = Reflect.getMetadata('providers', ApplicationsModule) as any[];

    expect(controllers).toBeDefined();
    expect(controllers).toContain(ApplicationFormsV1Controller);
    expect(controllers).toContain(MyApplicationsV1Controller);
    expect(controllers).toContain(ConsentV1Controller);
    expect(controllers).toHaveLength(3);

    expect(providers).toBeDefined();
    expect(providers).toContain(ApplicationsService);
    expect(providers).toContain(ConsentService);
    expect(providers).toHaveLength(2);
  });
});

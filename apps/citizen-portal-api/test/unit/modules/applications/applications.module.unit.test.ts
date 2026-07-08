import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { Module, Global } from '@nestjs/common';
import { DATABASE_CLIENT } from '@repo/nestjs/database';
import { ApplicationsModule } from '../../../../src/modules/applications/applications.module';
import { ApplicationFormsV1Controller } from '../../../../src/modules/applications/controllers/application-forms-v1.controller';
import { MyApplicationsV1Controller } from '../../../../src/modules/applications/controllers/my-applications-v1.controller';
import { ApplicationsService } from '../../../../src/modules/applications/services/applications.service';

describe('ApplicationsModule Unit Tests', () => {
  it('should compile ApplicationsModule successfully and resolve all controllers and providers', async () => {
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
      imports: [MockDatabaseModule, ApplicationsModule],
    }).compile();

    expect(moduleRef).toBeDefined();

    // Verify controllers are properly instantiated
    const formController = moduleRef.get(ApplicationFormsV1Controller);
    const myController = moduleRef.get(MyApplicationsV1Controller);
    expect(formController).toBeDefined();
    expect(myController).toBeDefined();

    // Verify service is properly instantiated
    const service = moduleRef.get(ApplicationsService);
    expect(service).toBeDefined();

    await moduleRef.close();
  });

  it('should verify metadata declaration directly', () => {
    const controllers = Reflect.getMetadata('controllers', ApplicationsModule) as any[];
    const providers = Reflect.getMetadata('providers', ApplicationsModule) as any[];

    expect(controllers).toBeDefined();
    expect(controllers).toContain(ApplicationFormsV1Controller);
    expect(controllers).toContain(MyApplicationsV1Controller);
    expect(controllers).toHaveLength(2);

    expect(providers).toBeDefined();
    expect(providers).toContain(ApplicationsService);
    expect(providers).toHaveLength(1);
  });
});

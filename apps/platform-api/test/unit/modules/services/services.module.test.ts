import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { Module, Global } from '@nestjs/common';
import { DATABASE_CLIENT } from '@repo/nestjs/database';
import { ServicesModule } from '../../../../src/modules/services/services.module';
import { ServicesV1Controller } from '../../../../src/modules/services/controllers/services-v1.controller';
import { ServicesService } from '../../../../src/modules/services/services/services.service';
import { ServiceVersionsService } from '../../../../src/modules/services/services/service-versions.service';
import { ReferenceableServicesService } from '../../../../src/modules/services/services/referenceable-services.service';

describe('ServicesModule Unit Test Suite', () => {
  it('should compile ServicesModule successfully and resolve all controllers and providers', async () => {
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
      imports: [MockDatabaseModule, ServicesModule],
    }).compile();

    expect(moduleRef).toBeDefined();

    // Verify controllers
    expect(moduleRef.get(ServicesV1Controller)).toBeDefined();

    // Verify services
    expect(moduleRef.get(ServicesService)).toBeDefined();
    expect(moduleRef.get(ServiceVersionsService)).toBeDefined();
    expect(moduleRef.get(ReferenceableServicesService)).toBeDefined();

    await moduleRef.close();
  });

  it('should verify metadata declaration directly', () => {
    const controllers = Reflect.getMetadata('controllers', ServicesModule) as any[];
    const providers = Reflect.getMetadata('providers', ServicesModule) as any[];

    expect(controllers).toBeDefined();
    expect(controllers).toContain(ServicesV1Controller);
    expect(controllers).toHaveLength(1);

    expect(providers).toBeDefined();
    expect(providers).toContain(ServicesService);
    expect(providers).toContain(ServiceVersionsService);
    expect(providers).toContain(ReferenceableServicesService);
    expect(providers).toHaveLength(3);
  });
});

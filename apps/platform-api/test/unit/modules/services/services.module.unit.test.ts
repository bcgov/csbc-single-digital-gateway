import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { Module, Global } from '@nestjs/common';
import { DATABASE_CLIENT } from '@repo/nestjs/database';
import { ServicesModule } from '../../../../src/modules/services/services.module';
import { ServicesV1Controller } from '../../../../src/modules/services/controllers/services-v1.controller';
import { ServiceReferencesV1Controller } from '../../../../src/modules/services/controllers/service-references-v1.controller';
import { ServicesService } from '../../../../src/modules/services/services/services.service';
import { ServiceVersionsService } from '../../../../src/modules/services/services/service-versions.service';
import { ServiceTypeResolver } from '../../../../src/modules/services/services/service-type.resolver';
import { ReferencesService } from '../../../../src/modules/services/services/references.service';
import { AgreementRefsService } from '../../../../src/modules/services/services/agreement-refs.service';

describe('ServicesModule Unit Tests', () => {
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
    expect(moduleRef.get(ServiceReferencesV1Controller)).toBeDefined();

    // Verify services
    expect(moduleRef.get(ServicesService)).toBeDefined();
    expect(moduleRef.get(ServiceVersionsService)).toBeDefined();
    expect(moduleRef.get(ServiceTypeResolver)).toBeDefined();
    expect(moduleRef.get(ReferencesService)).toBeDefined();
    expect(moduleRef.get(AgreementRefsService)).toBeDefined();

    await moduleRef.close();
  });

  it('should verify metadata declaration directly', () => {
    const controllers = Reflect.getMetadata('controllers', ServicesModule) as any[];
    const providers = Reflect.getMetadata('providers', ServicesModule) as any[];

    expect(controllers).toBeDefined();
    expect(controllers).toContain(ServicesV1Controller);
    expect(controllers).toContain(ServiceReferencesV1Controller);
    expect(controllers).toHaveLength(2);

    expect(providers).toBeDefined();
    expect(providers).toContain(ServicesService);
    expect(providers).toContain(ServiceVersionsService);
    expect(providers).toContain(ServiceTypeResolver);
    expect(providers).toContain(ReferencesService);
    expect(providers).toContain(AgreementRefsService);
    expect(providers).toHaveLength(5);
  });
});

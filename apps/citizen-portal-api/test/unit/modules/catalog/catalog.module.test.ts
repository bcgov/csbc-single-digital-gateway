import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { Module, Global } from '@nestjs/common';
import { DATABASE_CLIENT } from '@repo/nestjs/database';
import { CatalogModule } from '../../../../src/modules/catalog/catalog.module';
import { CatalogV1Controller } from '../../../../src/modules/catalog/controllers/catalog-v1.controller';
import { CatalogService } from '../../../../src/modules/catalog/services/catalog.service';

describe('CatalogModule Unit Test Suite', () => {
  it('should compile CatalogModule successfully and resolve all controllers and providers', async () => {
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
      imports: [MockDatabaseModule, CatalogModule],
    }).compile();

    expect(moduleRef).toBeDefined();

    // Verify controllers are properly instantiated
    const controller = moduleRef.get(CatalogV1Controller);
    expect(controller).toBeDefined();

    // Verify service is properly instantiated
    const service = moduleRef.get(CatalogService);
    expect(service).toBeDefined();

    await moduleRef.close();
  });

  it('should verify metadata declaration directly', () => {
    const controllers = Reflect.getMetadata('controllers', CatalogModule) as any[];
    const providers = Reflect.getMetadata('providers', CatalogModule) as any[];

    expect(controllers).toBeDefined();
    expect(controllers).toContain(CatalogV1Controller);
    expect(controllers).toHaveLength(1);

    expect(providers).toBeDefined();
    expect(providers).toContain(CatalogService);
    expect(providers).toHaveLength(1);
  });
});

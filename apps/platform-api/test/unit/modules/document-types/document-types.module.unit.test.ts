import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { Module, Global } from '@nestjs/common';
import { DATABASE_CLIENT } from '@repo/nestjs/database';
import { DocumentTypesModule } from '../../../../src/modules/document-types/document-types.module';
import { AdminDocumentTypesV1Controller } from '../../../../src/modules/document-types/controllers/admin-document-types-v1.controller';
import { DocumentTypesV1Controller } from '../../../../src/modules/document-types/controllers/document-types-v1.controller';
import { DocumentTypesService } from '../../../../src/modules/document-types/services/document-types.service';
import { DocumentTypeVersionsService } from '../../../../src/modules/document-types/services/document-type-versions.service';

describe('DocumentTypesModule Unit Tests', () => {
  it('should compile DocumentTypesModule successfully and resolve all controllers and providers', async () => {
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
      imports: [MockDatabaseModule, DocumentTypesModule],
    }).compile();

    expect(moduleRef).toBeDefined();

    // Verify controllers are properly instantiated
    const adminController = moduleRef.get(AdminDocumentTypesV1Controller);
    expect(adminController).toBeDefined();

    const controller = moduleRef.get(DocumentTypesV1Controller);
    expect(controller).toBeDefined();

    // Verify services are properly instantiated
    const typesService = moduleRef.get(DocumentTypesService);
    expect(typesService).toBeDefined();

    const versionsService = moduleRef.get(DocumentTypeVersionsService);
    expect(versionsService).toBeDefined();

    await moduleRef.close();
  });

  it('should verify metadata declaration directly', () => {
    const controllers = Reflect.getMetadata('controllers', DocumentTypesModule) as any[];
    const providers = Reflect.getMetadata('providers', DocumentTypesModule) as any[];

    expect(controllers).toBeDefined();
    expect(controllers).toContain(AdminDocumentTypesV1Controller);
    expect(controllers).toContain(DocumentTypesV1Controller);
    expect(controllers).toHaveLength(2);

    expect(providers).toBeDefined();
    expect(providers).toContain(DocumentTypesService);
    expect(providers).toContain(DocumentTypeVersionsService);
    expect(providers).toHaveLength(2);
  });
});

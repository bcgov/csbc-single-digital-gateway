import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { Module, Global } from '@nestjs/common';
import { DATABASE_CLIENT } from '@repo/nestjs/database';
import { WorkspacesModule } from '../../../../src/modules/workspaces/workspaces.module';
import { WorkspacesV1Controller } from '../../../../src/modules/workspaces/controllers/workspaces-v1.controller';
import { WorkspacesService } from '../../../../src/modules/workspaces/services/workspaces.service';

describe('WorkspacesModule Unit Test Suite', () => {
  it('should compile WorkspacesModule successfully and resolve all controllers and providers', async () => {
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
      imports: [MockDatabaseModule, WorkspacesModule],
    }).compile();

    expect(moduleRef).toBeDefined();

    // Verify controllers
    expect(moduleRef.get(WorkspacesV1Controller)).toBeDefined();

    // Verify services
    expect(moduleRef.get(WorkspacesService)).toBeDefined();

    await moduleRef.close();
  });

  it('should verify metadata declaration directly', () => {
    const controllers = Reflect.getMetadata('controllers', WorkspacesModule) as any[];
    const providers = Reflect.getMetadata('providers', WorkspacesModule) as any[];

    expect(controllers).toBeDefined();
    expect(controllers).toContain(WorkspacesV1Controller);
    expect(controllers).toHaveLength(1);

    expect(providers).toBeDefined();
    expect(providers).toContain(WorkspacesService);
    expect(providers).toHaveLength(1);
  });
});

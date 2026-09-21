import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DATABASE_CLIENT } from '@repo/nestjs/database';
import { GeoModule } from '../../../../src/modules/geo/geo.module';
import { GeoV1Controller } from '../../../../src/modules/geo/controllers/geo-v1.controller';
import { GeoService } from '../../../../src/modules/geo/services/geo.service';
import { GeocoderService } from '../../../../src/modules/geo/services/geocoder.service';

describe('GeoModule Unit Test Suite', () => {
  it('should compile GeoModule successfully and resolve all controllers and providers', async () => {
    const mockDbClient = {};

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
      imports: [MockDatabaseModule, ConfigModule.forRoot({ isGlobal: true }), GeoModule],
    }).compile();

    expect(moduleRef).toBeDefined();

    // Verify controllers are properly instantiated
    const controller = moduleRef.get(GeoV1Controller);
    expect(controller).toBeDefined();

    // Verify services are properly instantiated
    const geoService = moduleRef.get(GeoService);
    expect(geoService).toBeDefined();

    const geocoderService = moduleRef.get(GeocoderService);
    expect(geocoderService).toBeDefined();

    await moduleRef.close();
  });

  it('should verify metadata declaration directly', () => {
    const controllers = Reflect.getMetadata('controllers', GeoModule) as any[];
    const providers = Reflect.getMetadata('providers', GeoModule) as any[];

    expect(controllers).toBeDefined();
    expect(controllers).toContain(GeoV1Controller);
    expect(controllers).toHaveLength(1);

    expect(providers).toBeDefined();
    expect(providers).toContain(GeoService);
    expect(providers).toContain(GeocoderService);
    expect(providers).toHaveLength(2);
  });
});

import { HealthIndicatorService, TerminusModule } from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';
import { AppHealthModule } from 'src/modules/app-health.module';
import { DatabaseModule } from 'src/modules/database/database.module';
import { HealthModule } from 'src/modules/health/health.module';
import { DrizzleHealthIndicator } from '../indicators/drizzle-health.indicator';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppHealthModule, DatabaseModule, HealthModule, TerminusModule],
      controllers: [HealthController],
      providers: [DrizzleHealthIndicator, HealthIndicatorService],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

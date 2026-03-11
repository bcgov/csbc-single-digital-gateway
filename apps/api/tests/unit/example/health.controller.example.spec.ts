import { HealthIndicatorService, TerminusModule } from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';
import { AppHealthModule } from 'src/modules/app-health.module';
import { DatabaseModule } from 'src/modules/database/database.module';
import { HealthController } from 'src/modules/health/controllers/health.controller';
import { HealthModule } from 'src/modules/health/health.module';
import { DrizzleHealthIndicator } from 'src/modules/health/indicators/drizzle-health.indicator';

// Specify the title and the type of test in the syntax below
// The unit test file name should be health.controller.example.spec.ts
describe('HealthControllerExample (unit)', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppHealthModule, DatabaseModule, HealthModule, TerminusModule],
      controllers: [HealthController],
      providers: [DrizzleHealthIndicator, HealthIndicatorService],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  // Test case: should expect the controller to be defined
  // The comments are not required in an actual test file.
  // Make sure to capitalize the first letter to make it consistent across all test files.
  it('Should expect the controller to be defined', () => {
    expect(controller).toBeDefined();
  });
});

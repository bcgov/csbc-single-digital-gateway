import { HealthIndicatorService, TerminusModule } from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';
import { AppHealthModule } from 'src/modules/app-health.module';
import { DatabaseModule } from 'src/modules/database/database.module';
import { HealthModule } from 'src/modules/health/health.module';
import { HealthController } from '../controllers/health.controller';
import { DrizzleHealthIndicator } from '../indicators/drizzle-health.indicator';

// Specify the title and the type of test in the syntax below
// The unit test file name should be health.controller.spec.ts
describe('HealthControllerExample Unit Test', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppHealthModule, DatabaseModule, HealthModule, TerminusModule],
      controllers: [HealthController],
      providers: [DrizzleHealthIndicator, HealthIndicatorService],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  // Test case: should validate that the health controller is defined
  // The comments are not required in an actual test file.
  // Make sure to capitalize the first letter to make it consistent across all test files.
  it('Should validate that the health controller is defined', () => {
    expect(controller).toBeDefined();
  });
});

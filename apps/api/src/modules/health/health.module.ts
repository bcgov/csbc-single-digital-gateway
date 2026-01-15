import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { DatabaseModule } from '../database/database.module';
import { HealthController } from './controllers/health.controller';
import { DrizzleHealthIndicator } from './indicators/drizzle-health.indicator';

@Module({
  imports: [DatabaseModule, HttpModule, TerminusModule],
  controllers: [HealthController],
  providers: [DrizzleHealthIndicator],
})
export class HealthModule {}

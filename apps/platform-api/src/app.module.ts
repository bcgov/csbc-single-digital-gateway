import { Module } from '@nestjs/common';
import { HealthModule } from '@repo/nestjs/health';

@Module({
  // Cross-cutting modules (health, auth, ...) are imported here and stay at the
  // unversioned root. Feature modules live under src/modules/<feature>/.
  imports: [HealthModule],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from '@repo/nestjs/health';
import { validateEnv } from './config/env.schema';

@Module({
  imports: [
    // Validate the environment at boot (zod); expose typed config globally.
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    // Cross-cutting modules (health, auth, ...) are imported here and stay at the
    // unversioned root. Feature modules live under src/modules/<feature>/.
    HealthModule,
  ],
})
export class AppModule {}

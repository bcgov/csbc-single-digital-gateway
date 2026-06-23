import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createDatabase, type Database } from '@repo/database';
import { DatabaseModule } from '@repo/nestjs/database';
import { DatabaseHealthIndicator } from '@repo/nestjs/database-health';
import { HealthModule } from '@repo/nestjs/health';
import { validateEnv, type Env } from './config/env.schema';

@Module({
  imports: [
    // Validate the environment at boot (zod); expose typed config globally.
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    // Build the Drizzle client from the validated DATABASE_URL and register it globally
    // for injection via @InjectDatabase(). The pg pool is closed on shutdown.
    DatabaseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        createDatabase(config.get('DATABASE_URL', { infer: true })),
      onDestroy: (db: Database) => db.$client.end(),
    }),
    // Cross-cutting modules (health, auth, ...) are imported here and stay at the
    // unversioned root. Feature modules live under src/modules/<feature>/.
    // /health/ready reports the database via DatabaseHealthIndicator (select 1).
    HealthModule.forRoot({ readiness: [DatabaseHealthIndicator] }),
  ],
})
export class AppModule {}

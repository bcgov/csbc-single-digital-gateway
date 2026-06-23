import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createDatabase, type Database } from '@repo/database';
import { DatabaseModule } from '@repo/nestjs/database';
import { DatabaseHealthIndicator } from '@repo/nestjs/database-health';
import { HealthModule } from '@repo/nestjs/health';
import { LoggerModule } from '@repo/nestjs/logger';
import { validateEnv, type Env } from './config/env.schema';

@Module({
  imports: [
    // Validate the environment at boot (zod); expose typed config globally.
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    // Structured pino logging (global). pretty in development; silent in tests so the suite
    // stays quiet and the pino-pretty worker thread never starts.
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const nodeEnv = config.get('NODE_ENV', { infer: true });
        return {
          level: nodeEnv === 'test' ? 'silent' : config.get('LOG_LEVEL', { infer: true }),
          pretty: nodeEnv === 'development',
        };
      },
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

import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4001),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate function for `@nestjs/config`'s `ConfigModule.forRoot({ validate })`.
 * Fails fast (throws before the server listens) with a readable message when the
 * environment is invalid. The returned object becomes the config `ConfigService` serves.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

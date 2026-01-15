import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const AppConfigSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  HEALTH_PORT: z.coerce.number().default(9000),

  // Database
  DEFAULT_DB_NAME: z.string(),
  DEFAULT_DB_HOST: z.string(),
  DEFAULT_DB_PORT: z.coerce.number(),
  DEFAULT_DB_USER: z.string(),
  DEFAULT_DB_PASS: z.string(),
  DEFAULT_DB_SSL: z
    .enum(['true', 'false'])
    .transform((value) => (value === 'true' ? true : false)),

  // Identity Provider
  OIDC_ISSUER: z.string(),
  OIDC_JWKS_URI: z.string(),
});

export class AppConfigDto extends createZodDto(AppConfigSchema) {}

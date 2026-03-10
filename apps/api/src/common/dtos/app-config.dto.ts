import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const AppConfigSchema = z.object({
  // Server
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().default(4000),
  HEALTH_PORT: z.coerce.number().default(9000),

  // Database
  DB_NAME: z.string(),
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number(),
  DB_USER: z.string(),
  DB_PASS: z.string(),
  DB_SSL: z.enum(['true', 'false']).transform((value) => value === 'true'),

  // Identity Provider
  OIDC_ISSUER: z.string(),
  OIDC_CLIENT_ID: z.string(),
  OIDC_CLIENT_SECRET: z.string(),
  OIDC_REDIRECT_URI: z.string(),
  OIDC_POST_LOGOUT_REDIRECT_URI: z.string(),

  // Session
  SESSION_SECRET: z.string(),

  // Frontend
  FRONTEND_URL: z.string(),

  // Consent Manager
  CONSENT_MANAGER_API_URL: z.string().optional(),
});

export class AppConfigDto extends createZodDto(AppConfigSchema) {}

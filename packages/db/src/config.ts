import { z } from 'zod';

export const DbConfigSchema = z.object({
  DB_NAME: z.string(),
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number(),
  DB_USER: z.string(),
  DB_PASS: z.string(),
  DB_SSL: z
    .enum(['true', 'false'])
    .transform((value) => (value === 'true' ? true : false)),
});

export type DbConfig = z.infer<typeof DbConfigSchema>;

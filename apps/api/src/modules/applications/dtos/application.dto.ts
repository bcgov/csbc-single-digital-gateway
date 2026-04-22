import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const SubmitApplicationParamSchema = z.object({
  serviceId: z.string().uuid(),
  versionId: z.string().uuid(),
  applicationId: z.string().uuid(),
});

export class SubmitApplicationParamDto extends createZodDto(
  SubmitApplicationParamSchema,
) {}

export const SubmitApplicationQuerySchema = z.object({
  locale: z.string().min(1).default('en'),
});

export class SubmitApplicationQueryDto extends createZodDto(
  SubmitApplicationQuerySchema,
) {}

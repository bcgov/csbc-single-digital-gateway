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

export const ListApplicationsByServiceParamSchema = z.object({
  serviceId: z.string().uuid(),
});

export class ListApplicationsByServiceParamDto extends createZodDto(
  ListApplicationsByServiceParamSchema,
) {}

export const ListApplicationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export class ListApplicationsQueryDto extends createZodDto(
  ListApplicationsQuerySchema,
) {}

export const ApplicationIdParamSchema = z.object({
  applicationId: z.string().uuid(),
});

export class ApplicationIdParamDto extends createZodDto(
  ApplicationIdParamSchema,
) {}

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PaginationQuerySchema } from './common.dto';

export const PublicServiceListQuerySchema = PaginationQuerySchema.extend({
  locale: z.string().min(1).default('en'),
  serviceTypeId: z.string().uuid().optional(),
  orgUnitId: z.string().uuid().optional(),
});

export class PublicServiceListQueryDto extends createZodDto(
  PublicServiceListQuerySchema,
) {}

export const PublicServiceDetailQuerySchema = z.object({
  locale: z.string().min(1).default('en'),
});

export class PublicServiceDetailQueryDto extends createZodDto(
  PublicServiceDetailQuerySchema,
) {}

export const PublicServiceSchema = z.object({
  id: z.string().uuid(),
  serviceTypeId: z.string().uuid(),
  orgUnitId: z.string().uuid(),
  versionId: z.string().uuid(),
  publishedAt: z.string(),
  locale: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  content: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export class PublicServiceDto extends createZodDto(PublicServiceSchema) {}

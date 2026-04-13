import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PaginationQuerySchema } from './common.dto';

export const ServiceIdParamSchema = z.object({
  serviceId: z.string().uuid(),
});

export class ServiceIdParamDto extends createZodDto(ServiceIdParamSchema) {}

export const ServiceVersionIdParamSchema = z.object({
  serviceId: z.string().uuid(),
  versionId: z.string().uuid(),
});

export class ServiceVersionIdParamDto extends createZodDto(
  ServiceVersionIdParamSchema,
) {}

export const ServiceVersionLocaleParamSchema = z.object({
  serviceId: z.string().uuid(),
  versionId: z.string().uuid(),
  locale: z.string().min(1),
});

export class ServiceVersionLocaleParamDto extends createZodDto(
  ServiceVersionLocaleParamSchema,
) {}

export const CreateServiceBodySchema = z.object({
  serviceTypeId: z.string().uuid(),
  orgUnitId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  content: z.record(z.string(), z.unknown()).optional(),
});

export class CreateServiceBodyDto extends createZodDto(
  CreateServiceBodySchema,
) {}

export const UpsertServiceTranslationBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  content: z.record(z.string(), z.unknown()),
});

export class UpsertServiceTranslationBodyDto extends createZodDto(
  UpsertServiceTranslationBodySchema,
) {}

export const FindAllServicesQuerySchema = PaginationQuerySchema.extend({
  orgUnitId: z.string().uuid().optional(),
  serviceTypeId: z.string().uuid().optional(),
});

export class FindAllServicesQueryDto extends createZodDto(
  FindAllServicesQuerySchema,
) {}

export const AddContributorBodySchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['owner']),
});

export class AddContributorBodyDto extends createZodDto(
  AddContributorBodySchema,
) {}

export const ServiceContributorParamSchema = z.object({
  serviceId: z.string().uuid(),
  userId: z.string().uuid(),
});

export class ServiceContributorParamDto extends createZodDto(
  ServiceContributorParamSchema,
) {}

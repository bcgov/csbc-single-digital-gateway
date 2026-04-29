import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const TypeIdParamSchema = z.object({
  typeId: z.string().uuid(),
});

export class TypeIdParamDto extends createZodDto(TypeIdParamSchema) {}

export const TypeVersionIdParamSchema = z.object({
  typeId: z.string().uuid(),
  versionId: z.string().uuid(),
});

export class TypeVersionIdParamDto extends createZodDto(
  TypeVersionIdParamSchema,
) {}

export const TypeVersionLocaleParamSchema = z.object({
  typeId: z.string().uuid(),
  versionId: z.string().uuid(),
  locale: z.string().min(1),
});

export class TypeVersionLocaleParamDto extends createZodDto(
  TypeVersionLocaleParamSchema,
) {}

export const CreateTypeBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  schema: z.record(z.string(), z.unknown()).optional(),
  uiSchema: z.record(z.string(), z.unknown()).optional(),
});

export class CreateTypeBodyDto extends createZodDto(CreateTypeBodySchema) {}

export const UpsertTypeVersionTranslationBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  schema: z.record(z.string(), z.unknown()).optional(),
  uiSchema: z.record(z.string(), z.unknown()).optional(),
});

export class UpsertTypeVersionTranslationBodyDto extends createZodDto(
  UpsertTypeVersionTranslationBodySchema,
) {}

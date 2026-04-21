import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PaginationQuerySchema } from './common.dto';

export const DocIdParamSchema = z.object({
  docId: z.string().uuid(),
});

export class DocIdParamDto extends createZodDto(DocIdParamSchema) {}

export const DocVersionIdParamSchema = z.object({
  docId: z.string().uuid(),
  versionId: z.string().uuid(),
});

export class DocVersionIdParamDto extends createZodDto(
  DocVersionIdParamSchema,
) {}

export const DocVersionLocaleParamSchema = z.object({
  docId: z.string().uuid(),
  versionId: z.string().uuid(),
  locale: z.string().min(1),
});

export class DocVersionLocaleParamDto extends createZodDto(
  DocVersionLocaleParamSchema,
) {}

export const CreateDocBodySchema = z.object({
  consentDocumentTypeId: z.string().uuid(),
  orgUnitId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  content: z.record(z.string(), z.unknown()).optional(),
});

export class CreateDocBodyDto extends createZodDto(CreateDocBodySchema) {}

export const UpsertDocTranslationBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  content: z.record(z.string(), z.unknown()),
});

export class UpsertDocTranslationBodyDto extends createZodDto(
  UpsertDocTranslationBodySchema,
) {}

export const FindAllDocsQuerySchema = PaginationQuerySchema.extend({
  orgUnitId: z.string().uuid().optional(),
  consentDocumentTypeId: z.string().uuid().optional(),
});

export class FindAllDocsQueryDto extends createZodDto(FindAllDocsQuerySchema) {}

export const AddContributorBodySchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['owner']),
});

export class AddContributorBodyDto extends createZodDto(
  AddContributorBodySchema,
) {}

export const DocContributorParamSchema = z.object({
  docId: z.string().uuid(),
  userId: z.string().uuid(),
});

export class DocContributorParamDto extends createZodDto(
  DocContributorParamSchema,
) {}

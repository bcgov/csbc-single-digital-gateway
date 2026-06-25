import { z } from 'zod';

/**
 * Per-kind `definition` shapes (JSONForms). Top-level structure is validated; `schema`/`uischema` are
 * kept loose (`.catchall`) so arbitrary JSON-Schema / UI-Schema keys are preserved as data.
 */

/** A JSON Schema object (basic top-level shape; extra keys preserved). */
export const jsonSchemaSchema = z
  .object({
    type: z.string(),
    properties: z.record(z.string(), z.unknown()),
    required: z.array(z.string()),
  })
  .catchall(z.unknown());

/** A JSONForms UI schema (basic top-level shape; extra keys preserved). */
export const uiSchemaSchema = z
  .object({
    type: z.string(),
    elements: z.array(z.unknown()),
  })
  .catchall(z.unknown());

/** `basic-form`: a single page of fields. `description` is required (an empty string is allowed). */
export const basicFormDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  schema: jsonSchemaSchema,
  uischema: uiSchemaSchema,
});

/** A multi-stage page is a basic form definition plus a stable `id`. */
const pageSchema = basicFormDefinitionSchema.extend({ id: z.string() });

const stageSchema = z.object({
  id: z.string(),
  name: z.string(),
  pages: z.array(pageSchema),
});

/** `multi-stage-form`: stages of pages. */
export const multiStageDefinitionSchema = z.object({
  stages: z.array(stageSchema),
});

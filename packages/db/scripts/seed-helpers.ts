import { z } from "zod";

export const TABLE_NAMES = [
  "org_units",
  "org_unit_relations",
  "service_types",
  "service_type_versions",
  "service_type_version_translations",
  "services",
  "service_versions",
  "service_version_translations",
] as const;

export type TableName = (typeof TABLE_NAMES)[number];

const INSERT_ORDER: readonly TableName[] = [
  "org_units",
  "org_unit_relations",
  "service_types",
  "service_type_versions",
  "service_type_version_translations",
  "services",
  "service_versions",
  "service_version_translations",
];

export function getInsertOrder(): readonly TableName[] {
  return INSERT_ORDER;
}

export function getTruncateStatement(): string {
  return `TRUNCATE ${TABLE_NAMES.join(", ")} RESTART IDENTITY CASCADE;`;
}

export function splitParentForTwoPass<
  T extends Record<string, unknown> & { id: string },
  K extends keyof T,
>(
  rows: readonly T[],
  pointerKey: K,
): {
  firstPass: T[];
  pointerUpdates: Array<{ id: string; pointerId: string | null }>;
} {
  const firstPass: T[] = [];
  const pointerUpdates: Array<{ id: string; pointerId: string | null }> = [];

  for (const row of rows) {
    const pointerValue = row[pointerKey];
    const pointerId =
      typeof pointerValue === "string"
        ? pointerValue
        : pointerValue == null
          ? null
          : null;

    firstPass.push({ ...row, [pointerKey]: null });
    if (pointerId !== null) {
      pointerUpdates.push({ id: row.id, pointerId });
    }
  }

  return { firstPass, pointerUpdates };
}

export function parseFixture<T>(json: unknown, schema: z.ZodType<T>): T[] {
  const arraySchema = z.array(schema);
  return arraySchema.parse(json);
}

const isoDate = z
  .union([z.string(), z.date()])
  .transform((value) => (value instanceof Date ? value : new Date(value)));

const nullableIsoDate = z
  .union([z.string(), z.date(), z.null()])
  .transform((value) => {
    if (value === null) return null;
    return value instanceof Date ? value : new Date(value);
  });

export const orgUnitFixtureSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.enum(["org", "ministry", "division", "branch", "team"]),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export const orgUnitRelationFixtureSchema = z.object({
  ancestorId: z.string().uuid(),
  descendantId: z.string().uuid(),
  depth: z.number().int(),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export const serviceTypeFixtureSchema = z.object({
  id: z.string().uuid(),
  publishedServiceTypeVersionId: z.string().uuid().nullable(),
  createdAt: isoDate,
  updatedAt: isoDate,
});

const versionStatus = z.enum(["draft", "published", "archived"]);

export const serviceTypeVersionFixtureSchema = z.object({
  id: z.string().uuid(),
  serviceTypeId: z.string().uuid(),
  version: z.number().int(),
  status: versionStatus,
  archivedAt: nullableIsoDate.nullable(),
  publishedAt: nullableIsoDate.nullable(),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export const serviceTypeVersionTranslationFixtureSchema = z.object({
  id: z.string().uuid(),
  serviceTypeVersionId: z.string().uuid(),
  locale: z.string(),
  name: z.string(),
  description: z.string(),
  schema: z.unknown(),
  uiSchema: z.unknown(),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export const serviceFixtureSchema = z.object({
  id: z.string().uuid(),
  orgUnitId: z.string().uuid(),
  publishedServiceVersionId: z.string().uuid().nullable(),
  serviceTypeId: z.string().uuid(),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export const serviceVersionFixtureSchema = z.object({
  id: z.string().uuid(),
  serviceTypeVersionId: z.string().uuid(),
  serviceId: z.string().uuid(),
  version: z.number().int(),
  status: versionStatus,
  archivedAt: nullableIsoDate.nullable(),
  publishedAt: nullableIsoDate.nullable(),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export const serviceVersionTranslationFixtureSchema = z.object({
  id: z.string().uuid(),
  serviceVersionId: z.string().uuid(),
  locale: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  content: z.unknown(),
  createdAt: isoDate,
  updatedAt: isoDate,
});

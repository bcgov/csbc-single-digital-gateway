import {
  AnyPgColumn,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const schemas = pgTable("schemas", {
  id: uuid().primaryKey().defaultRandom(),
  publishedSchemaVersionId: uuid().references(
    (): AnyPgColumn => schemaVersions.id,
    {
      onDelete: "set null",
    },
  ),

  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const schemaVersions = pgTable(
  "schema_versions",
  {
    id: uuid().primaryKey().defaultRandom(),
    schemaId: uuid()
      .notNull()
      .references(() => schemas.id, { onDelete: "cascade" }),

    version: integer().notNull(),
    schema: jsonb().notNull().default(`{}`),
    uiSchema: jsonb().notNull().default(`{}`),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("schema_versions_schema_version_unique").on(
      t.schemaId,
      t.version,
    ),
  ],
);

import {
  AnyPgColumn,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { orgUnits } from "./organizations.ts";
import { schemas, schemaVersions } from "./schemas.ts";
import { users } from "./users.ts";

export const serviceContributorRoleEnum = pgEnum("service_contributor_role", [
  "owner",
]);

export const serviceVersionStatusEnum = pgEnum("service_version_status", [
  "draft",
  "published",
  "archived",
]);

export const services = pgTable("services", {
  id: uuid().primaryKey().defaultRandom(),
  orgUnitId: uuid()
    .notNull()
    .references(() => orgUnits.id),
  publishedServiceVersionId: uuid().references(() => serviceVersions.id, {
    onDelete: "set null",
  }),
  serviceTypeId: uuid()
    .notNull()
    .references(() => serviceTypes.id)
    .unique(),

  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const serviceContributors = pgTable(
  "service_contributors",
  {
    serviceId: uuid()
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    role: serviceContributorRoleEnum().notNull(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.serviceId, t.userId] })],
);

export const serviceTypes = pgTable("service_types", {
  id: uuid().primaryKey().defaultRandom(),
  schemaId: uuid()
    .notNull()
    .references(() => schemas.id),

  name: text().notNull(),
  description: text(),

  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const serviceVersions = pgTable(
  "service_versions",
  {
    id: uuid().primaryKey().defaultRandom(),
    schemaVersionId: uuid()
      .notNull()
      .references(() => schemaVersions.id),
    serviceId: uuid()
      .notNull()
      .references((): AnyPgColumn => services.id, { onDelete: "cascade" }),

    version: integer().notNull(),
    status: serviceVersionStatusEnum().notNull(),

    archivedAt: timestamp({ withTimezone: true }),
    publishedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("service_versions_service_version_unique").on(
      t.serviceId,
      t.version,
    ),
  ],
);

export const serviceVersionTranslations = pgTable(
  "service_version_translations",
  {
    id: uuid().primaryKey().defaultRandom(),
    serviceVersionId: uuid()
      .notNull()
      .references(() => serviceVersions.id, { onDelete: "cascade" }),

    locale: text().notNull(),
    content: jsonb().notNull().default(`{}`),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("service_version_translation_service_version_locale_unique").on(
      t.serviceVersionId,
      t.locale,
    ),
  ],
);

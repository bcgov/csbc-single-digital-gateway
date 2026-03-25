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
import { users } from "./users.ts";

export const consentDocumentContributorRoleEnum = pgEnum(
  "consent_document_contributor_role",
  ["owner"],
);

export const consentDocumentTypeVersionStatusEnum = pgEnum(
  "consent_document_type_version_status",
  ["draft", "published", "archived"],
);

export const consentDocumentVersionStatusEnum = pgEnum(
  "consent_document_version_status",
  ["draft", "published", "archived"],
);

export const consentStatementActionEnum = pgEnum("consent_statement_action", [
  "approve",
  "deny",
  "revoke",
]);

export const consentDocuments = pgTable("consent_documents", {
  id: uuid().primaryKey().defaultRandom(),
  consentDocumentTypeId: uuid()
    .notNull()
    .references(() => consentDocumentTypes.id),
  orgUnitId: uuid()
    .notNull()
    .references(() => orgUnits.id),
  publishedConsentDocumentVersionId: uuid().references(
    (): AnyPgColumn => consentDocumentVersions.id,
    { onDelete: "set null" },
  ),

  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const consentDocumentContributors = pgTable(
  "consent_document_contributors",
  {
    consentDocumentId: uuid()
      .notNull()
      .references(() => consentDocuments.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    role: consentDocumentContributorRoleEnum().notNull(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.consentDocumentId, t.userId] })],
);

export const consentDocumentTypes = pgTable("consent_document_types", {
  id: uuid().primaryKey().defaultRandom(),
  publishedConsentDocumentTypeVersionId: uuid().references(
    (): AnyPgColumn => consentDocumentTypeVersions.id,
    { onDelete: "set null" },
  ),

  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const consentDocumentTypeVersions = pgTable(
  "consent_document_type_versions",
  {
    id: uuid().primaryKey().defaultRandom(),
    consentDocumentTypeId: uuid()
      .notNull()
      .references(() => consentDocumentTypes.id, { onDelete: "cascade" }),

    version: integer().notNull(),
    status: consentDocumentTypeVersionStatusEnum().notNull(),

    archivedAt: timestamp({ withTimezone: true }),
    publishedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex(
      "consent_document_type_versions_consent_document_type_version_unique",
    ).on(t.consentDocumentTypeId, t.version),
  ],
);

export const consentDocumentTypeVersionTranslations = pgTable(
  "consent_document_type_version_translations",
  {
    id: uuid().primaryKey().defaultRandom(),
    consentDocumentTypeVersionId: uuid()
      .notNull()
      .references(() => consentDocumentTypeVersions.id, {
        onDelete: "cascade",
      }),

    locale: text().notNull(),
    name: text().notNull(),
    description: text().notNull(),
    schema: jsonb().notNull().default(`{}`),
    uiSchema: jsonb().notNull().default(`{}`),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex(
      "consent_document_type_version_translations_version_locale_unique",
    ).on(t.consentDocumentTypeVersionId, t.locale),
  ],
);

export const consentDocumentVersions = pgTable(
  "consent_document_versions",
  {
    id: uuid().primaryKey().defaultRandom(),
    consentDocumentId: uuid()
      .notNull()
      .references(() => consentDocuments.id, { onDelete: "cascade" }),
    consentDocumentTypeVersionId: uuid()
      .notNull()
      .references(() => consentDocumentTypeVersions.id),

    version: integer().notNull(),
    status: consentDocumentVersionStatusEnum().notNull(),

    archivedAt: timestamp({ withTimezone: true }),
    publishedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("consent_document_versions_consent_document_version_unique").on(
      t.consentDocumentId,
      t.version,
    ),
  ],
);

export const consentDocumentVersionTranslations = pgTable(
  "consent_document_version_translations",
  {
    id: uuid().primaryKey().defaultRandom(),
    consentDocumentVersionId: uuid()
      .notNull()
      .references(() => consentDocumentVersions.id, { onDelete: "cascade" }),

    locale: text().notNull(),
    content: jsonb().notNull().default(`{}`),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex(
      "consent_document_version_translations_consent_document_version_locale_unique",
    ).on(t.consentDocumentVersionId, t.locale),
  ],
);

export const consentStatements = pgTable("consent_statements", {
  id: uuid().primaryKey(),
  consentDocumentVersionId: uuid()
    .notNull()
    .references(() => consentDocumentVersions.id, { onDelete: "cascade" }),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  action: consentStatementActionEnum().notNull(),

  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

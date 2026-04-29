import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  services,
  serviceVersions,
  serviceVersionTranslations,
} from "./service-catalogue.ts";
import { users } from "./users.ts";

export const applications = pgTable(
  "applications",
  {
    id: uuid().primaryKey().defaultRandom(),

    serviceId: uuid()
      .notNull()
      .references(() => services.id),
    serviceVersionId: uuid()
      .notNull()
      .references(() => serviceVersions.id),
    serviceVersionTranslationId: uuid()
      .notNull()
      .references(() => serviceVersionTranslations.id),
    serviceApplicationId: uuid().notNull(),
    serviceApplicationType: text().notNull(),

    userId: uuid()
      .notNull()
      .references(() => users.id),
    delegateUserId: uuid().references(() => users.id, { onDelete: "set null" }),

    metadata: jsonb().notNull().default({}),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("applications_user_id_idx").on(t.userId),
    index("applications_service_id_idx").on(t.serviceId),
  ],
);

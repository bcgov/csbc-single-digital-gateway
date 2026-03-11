import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users.ts";

export const identities = pgTable(
  "identities",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid().references(() => users.id, { onDelete: "cascade" }),

    issuer: text().notNull(),
    sub: text().notNull(),
    claims: jsonb().notNull().default({}),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("identities_issuer_sub_unique").on(table.issuer, table.sub),
  ],
);

import {
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users.ts";

export const orgUnitMemberRoleEnum = pgEnum("org_unit_member_role", [
  "admin",
  "member",
]);

export const orgUnitTypeEnum = pgEnum("org_unit_type", [
  "org",
  "division",
  "branch",
  "team",
]);

export const orgUnits = pgTable("org_units", {
  id: uuid().primaryKey().defaultRandom(),

  name: text().notNull(),
  type: orgUnitTypeEnum().notNull(),

  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const orgUnitMembers = pgTable(
  "org_unit_members",
  {
    orgUnitId: uuid()
      .notNull()
      .references(() => orgUnits.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    role: orgUnitMemberRoleEnum().notNull(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.orgUnitId, t.userId] })],
);

export const orgUnitRelations = pgTable(
  "org_unit_relations",
  {
    ancestorId: uuid()
      .notNull()
      .references(() => orgUnits.id, { onDelete: "cascade" }),
    descendantId: uuid()
      .notNull()
      .references(() => orgUnits.id, { onDelete: "cascade" }),

    depth: integer().notNull(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.ancestorId, t.descendantId] })],
);

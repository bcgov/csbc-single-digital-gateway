import {
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "staff", "citizen"]);

export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),

  name: text(),
  email: text(),

  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: roleEnum().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.role] })],
);

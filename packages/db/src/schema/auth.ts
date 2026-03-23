import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const sessions = pgTable("sessions", {
  id: uuid().primaryKey(),
  userId: text().notNull(),
  email: text(),
  username: text(),
  accessToken: text().notNull(),
  refreshToken: text(),
  idToken: text(),
  accessTokenExpiresAt: timestamp({ withTimezone: true }),
  userInfo: jsonb().$type<Record<string, unknown>>(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
});

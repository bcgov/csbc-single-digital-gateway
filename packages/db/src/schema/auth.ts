import { index, json, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const session = pgTable(
  "session",
  {
    sid: varchar("sid").notNull().primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire", { precision: 6 }).notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

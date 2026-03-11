import { relations } from "drizzle-orm";
import { identities } from "./auth.ts";
import { users } from "./users.ts";

export const usersRelations = relations(users, ({ many }) => ({
  identities: many(identities),
}));

export const identitiesRelations = relations(identities, ({ one }) => ({
  user: one(users, {
    fields: [identities.userId],
    references: [users.id],
  }),
}));

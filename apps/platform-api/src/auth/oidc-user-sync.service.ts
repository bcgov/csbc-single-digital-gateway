import { Injectable } from '@nestjs/common';
import { type Database, identities, users } from '@repo/database';
import type { AuthUser, AuthUserSync, OidcClaims } from '@repo/nestjs/auth';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, eq, sql } from 'drizzle-orm';

export interface SyncedClaims {
  issuer: string;
  sub: string;
  email?: string;
  displayName: string;
  givenName: string;
  familyName: string;
}

// The drizzle transaction handle, derived from the client (avoids importing pg-core internals).
type DbTx = Parameters<Parameters<Database['transaction']>[0]>[0];

const str = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

/** Map OIDC claims to the user/identity fields (pure — `iss`/`preferred_username` via index). */
export function mapClaims(claims: OidcClaims): SyncedClaims {
  const email = str(claims.email);
  const displayName = str(claims.name) ?? str(claims.preferred_username) ?? email ?? claims.sub;
  const result: SyncedClaims = {
    issuer: str(claims.iss) ?? '',
    sub: claims.sub,
    displayName,
    givenName: str(claims.given_name) ?? '',
    familyName: str(claims.family_name) ?? '',
  };
  if (email !== undefined) {
    result.email = email;
  }
  return result;
}

/**
 * Implements the `@repo/nestjs/auth` sync port against `@repo/database`: on login, upsert the
 * identity on `(issuer, sub)` (creating a `users` row on first sight) and return the canonical
 * `AuthUser` with roles from `users.roles`. Registered as `AUTH_USER_SYNC` in app.module.
 */
@Injectable()
export class OidcUserSyncService implements AuthUserSync {
  constructor(@InjectDatabase() private readonly db: Database) {}

  async onSignIn(claims: OidcClaims): Promise<AuthUser> {
    const m = mapClaims(claims);

    const userId = await this.db.transaction(async (tx: DbTx) => {
      const existing = await tx
        .select({ userId: identities.userId })
        .from(identities)
        .where(and(eq(identities.issuer, m.issuer), eq(identities.sub, m.sub)))
        .limit(1);

      const found = existing[0];
      if (found) {
        // Re-login: refresh the identity profile + last_login_at; never touch users.roles.
        await tx
          .update(identities)
          .set({
            lastLoginAt: sql`now()`,
            displayName: m.displayName,
            givenName: m.givenName,
            familyName: m.familyName,
            email: m.email ?? null,
          })
          .where(and(eq(identities.issuer, m.issuer), eq(identities.sub, m.sub)));
        return found.userId;
      }

      // First login: create the canonical user (platform-api baseline role: staff) + identity.
      const inserted = await tx
        .insert(users)
        .values({
          displayName: m.displayName,
          givenName: m.givenName,
          familyName: m.familyName,
          email: m.email,
          roles: ['staff'],
        })
        .returning({ id: users.id });
      const newUser = inserted[0];
      if (newUser === undefined) {
        throw new Error('auth sync: failed to create user');
      }
      await tx.insert(identities).values({
        userId: newUser.id,
        issuer: m.issuer,
        sub: m.sub,
        displayName: m.displayName,
        givenName: m.givenName,
        familyName: m.familyName,
        email: m.email,
        lastLoginAt: sql`now()`,
      });
      return newUser.id;
    });

    const rows = await this.db
      .select({ id: users.id, roles: users.roles })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const user = rows[0];
    if (user === undefined) {
      throw new Error('auth sync: user not found after upsert');
    }
    return { id: user.id, roles: user.roles, claims };
  }
}

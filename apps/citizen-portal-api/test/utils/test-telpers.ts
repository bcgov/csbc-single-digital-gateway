import { AuthUser } from '@repo/nestjs/auth';

/**
 * E2E helper seeding a test citizen user into the database via direct SQL/Drizzle insertion.
 * Auth + validation posture for the citizen application surface (feature 63). The test DATABASE_URL
 * is unreachable, so handler queries aren't exercised here (covered by a live-DB probe). We assert:
 *  - `/v1/me/applications*` is protected (401 without a session);
 *  - the form-to-fill read is public (not 401);
 *  - request bodies validate (400) once past the guard.
 */
export const seedUser = (roles: string[] = ['citizen']): string =>
  JSON.stringify({ id: 'u', roles, claims: { sub: 'u' } } satisfies AuthUser);

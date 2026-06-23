import 'reflect-metadata';

// AppModule requires DATABASE_URL (zod, fail-fast). createDatabase() is lazy, so e2e tests
// boot with the var set but no running Postgres. Point it at an UNREACHABLE port so the
// database readiness indicator deterministically reports `down` (→ /health/ready 503) in
// CI; the 200-when-up path is verified against a real Postgres in integration testing.
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5599/sdg';

// AuthModule requires OIDC/auth env. Under NODE_ENV=test the module injects a stub config and
// skips discovery, so these are dummy values that only need to satisfy zod validation — no
// Keycloak runs in the suite. The live login round-trip is verified separately.
process.env.OIDC_ISSUER ??= 'http://localhost:8080/realms/sdg';
process.env.OIDC_CLIENT_ID ??= 'platform-api';
process.env.OIDC_CLIENT_SECRET ??= 'test-secret';
process.env.OIDC_REDIRECT_URI ??= 'http://localhost:4001/auth/callback';
process.env.AUTH_SESSION_SECRET ??= 'test-session-secret-0123456789';
process.env.AUTH_POST_LOGIN_REDIRECT ??= 'http://localhost:3000/app';

import 'reflect-metadata';

// AppModule requires NOTIFICATION_DATABASE_URL (zod, fail-fast). createDatabase() is lazy,
// so e2e tests boot with the var set but no running Postgres. Point it at an UNREACHABLE
// port so the database readiness indicator deterministically reports `down` (→
// /health/ready 503) in CI; the 200-when-up path is verified against a real Postgres in
// integration testing.
process.env.NOTIFICATION_DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5599/sdg_notifications';

// The m2m guard requires OIDC_ISSUER (zod, fail-fast). Under NODE_ENV=test the app module
// injects a stub verifier (accepts the literal 'test-token'), so this is a dummy value that
// only satisfies validation — no Keycloak runs in the suite. The live JWKS round-trip is
// verified separately in integration.
process.env.OIDC_ISSUER ??= 'http://localhost:8080/realms/sdg';

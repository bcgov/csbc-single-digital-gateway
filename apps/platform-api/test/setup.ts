import 'reflect-metadata';

// AppModule requires DATABASE_URL (zod, fail-fast). createDatabase() is lazy, so e2e tests
// boot with the var set but no running Postgres. Point it at an UNREACHABLE port so the
// database readiness indicator deterministically reports `down` (→ /health/ready 503) in
// CI; the 200-when-up path is verified against a real Postgres in integration testing.
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5599/sdg';

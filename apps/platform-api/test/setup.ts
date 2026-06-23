import 'reflect-metadata';

// AppModule now requires DATABASE_URL (zod, fail-fast). createDatabase() is lazy, so e2e
// tests that boot AppModule need the var set but no running Postgres. Set a default for
// every test here so each e2e file doesn't have to.
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/sdg';

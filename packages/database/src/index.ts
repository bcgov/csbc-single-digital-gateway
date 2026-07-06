// Public surface of @repo/database.
//
// Tables, enums, and row types are re-exported flat (e.g. `users`, `User`) and also as a
// `schema` namespace (e.g. `schema.users`) for callers that prefer to namespace them.
export * from './schema';
export * as schema from './schema';

export { createDatabase } from './client';
export type { CreateDatabaseOptions, Database } from './client';

export { resolvePgSsl } from './ssl';
export type { PgSslOptions } from './ssl';

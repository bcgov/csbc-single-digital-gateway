// Re-exports every table, enum, and inferred row type. The whole namespace is also passed
// to drizzle() as the relational schema (see ../client.ts), so every table MUST be exported
// from here to be query-buildable and to appear in generated migrations.
export * from './users';
export * from './workspaces';
export * from './document-types';
export * from './documents';
export * from './submissions';
export * from './reviews';
export * from './service-agreement-consents';

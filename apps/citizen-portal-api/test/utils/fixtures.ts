// Mutating requests must carry an allowlisted Origin to clear the CSRF guard (which runs before
// AuthGuard); it defaults to the local SPA origin. Without it, mutations are 403'd, not 401'd.
export const ORIGIN = 'http://localhost:3000';

// Reusable UUID for tests
export const UUID = '11111111-1111-4111-8111-111111111111';

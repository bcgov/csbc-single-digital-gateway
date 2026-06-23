/**
 * Tracks a user's active sessions so they can all be revoked ("logout everywhere"). The package
 * ships a no-op default; consumers implement it against their session store (e.g. Valkey). The
 * callback calls `track` on login; `POST /auth/logout?everywhere=true` calls `revokeAll`.
 */
export interface SessionRegistry {
  track(userId: string, sessionId: string): Promise<void>;
  revokeAll(userId: string): Promise<void>;
}

/** Default: single-session logout only (no cross-session revocation). */
export const noopSessionRegistry: SessionRegistry = {
  track: () => Promise.resolve(),
  revokeAll: () => Promise.resolve(),
};

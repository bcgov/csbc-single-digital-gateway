import type { SessionRegistry } from '@repo/nestjs/auth';
import type Valkey from 'iovalkey';

// connect-redis stores each session at `<prefix><sessionId>`; this MUST match the `prefix`
// passed to RedisStore in session.factory.ts, or revokeAll deletes the wrong keys.
const SESSION_KEY_PREFIX = 'sdg:sess:';

/** The per-user index of active session ids (a Valkey set). */
const userSessionsKey = (userId: string): string => `sdg:user-sessions:${userId}`;

/**
 * Valkey-backed {@link SessionRegistry}: indexes each login under its user so that
 * "logout everywhere" can delete every one of that user's connect-redis session keys.
 */
export class ValkeySessionRegistry implements SessionRegistry {
  constructor(private readonly client: Valkey) {}

  async track(userId: string, sessionId: string): Promise<void> {
    await this.client.sadd(userSessionsKey(userId), sessionId);
  }

  async revokeAll(userId: string): Promise<void> {
    const key = userSessionsKey(userId);
    const sessionIds = await this.client.smembers(key);
    if (sessionIds.length > 0) {
      await this.client.del(...sessionIds.map((sid) => `${SESSION_KEY_PREFIX}${sid}`));
    }
    await this.client.del(key);
  }
}

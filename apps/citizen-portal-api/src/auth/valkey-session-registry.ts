import type { SessionRegistry } from '@repo/nestjs/auth';
import type Valkey from 'iovalkey';

/**
 * Valkey-backed {@link SessionRegistry}: indexes each login under its user so that
 * "logout everywhere" can delete every one of that user's connect-redis session keys. The
 * `prefix` (e.g. `sdg:`) MUST match `SESSION_KEY_PREFIX` used by `session.factory.ts`, or
 * `revokeAll` deletes the wrong keys — and MUST be unique per app sharing a Valkey.
 */
export class ValkeySessionRegistry implements SessionRegistry {
  constructor(
    private readonly client: Valkey,
    private readonly prefix: string,
  ) {}

  /** The per-user index of active session ids (a Valkey set). */
  private userSessionsKey(userId: string): string {
    return `${this.prefix}user-sessions:${userId}`;
  }

  async track(userId: string, sessionId: string): Promise<void> {
    await this.client.sadd(this.userSessionsKey(userId), sessionId);
  }

  async revokeAll(userId: string): Promise<void> {
    const key = this.userSessionsKey(userId);
    const sessionIds = await this.client.smembers(key);
    if (sessionIds.length > 0) {
      await this.client.del(...sessionIds.map((sid) => `${this.prefix}sess:${sid}`));
    }
    await this.client.del(key);
  }
}

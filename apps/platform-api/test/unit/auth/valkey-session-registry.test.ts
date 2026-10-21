import { describe, expect, it, vi } from 'vitest';
import { ValkeySessionRegistry } from '../../../src/auth/valkey-session-registry';

/** Minimal in-memory fake of the iovalkey commands the registry uses. */
const makeClient = (sets: Record<string, string[]> = {}) => ({
  sadd: vi.fn((key: string, member: string) => {
    (sets[key] ??= []).push(member);
    return Promise.resolve(1);
  }),
  smembers: vi.fn((key: string) => Promise.resolve(sets[key] ?? [])),
  del: vi.fn((...keys: string[]) => Promise.resolve(keys.length)),
});

describe('ValkeySessionRegistry', () => {
  it('Should add the session id to the user’s session set on track()', async () => {
    const client = makeClient();
    const registry = new ValkeySessionRegistry(client as never, 'sdg:');

    await registry.track('user-1', 'sid-1');

    expect(client.sadd).toHaveBeenCalledWith('sdg:user-sessions:user-1', 'sid-1');
  });

  it('Should delete every connect-redis session key and the index set on revokeAll()', async () => {
    const client = makeClient({ 'sdg:user-sessions:user-1': ['sid-1', 'sid-2'] });
    const registry = new ValkeySessionRegistry(client as never, 'sdg:');

    await registry.revokeAll('user-1');

    // Session keys are deleted using the connect-redis prefix (must match session.factory.ts).
    expect(client.del).toHaveBeenCalledWith('sdg:sess:sid-1', 'sdg:sess:sid-2');
    // ...and the per-user index set itself is removed.
    expect(client.del).toHaveBeenCalledWith('sdg:user-sessions:user-1');
  });

  it('Should only clear the (empty) index on revokeAll for a user with no tracked sessions', async () => {
    const client = makeClient();
    const registry = new ValkeySessionRegistry(client as never, 'sdg:');

    await registry.revokeAll('ghost');

    expect(client.del).toHaveBeenCalledTimes(1);
    expect(client.del).toHaveBeenCalledWith('sdg:user-sessions:ghost');
  });

  it('Should namespace keys by the configured prefix (per-app isolation on a shared Valkey)', async () => {
    const client = makeClient({ 'cpa:user-sessions:user-1': ['sid-9'] });
    const registry = new ValkeySessionRegistry(client as never, 'cpa:');

    await registry.track('user-2', 'sid-2');
    expect(client.sadd).toHaveBeenCalledWith('cpa:user-sessions:user-2', 'sid-2');

    await registry.revokeAll('user-1');
    expect(client.del).toHaveBeenCalledWith('cpa:sess:sid-9');
    expect(client.del).toHaveBeenCalledWith('cpa:user-sessions:user-1');
  });

  it('Should add the session id to the user’s session set on track()', async () => {
    const client = makeClient();
    const registry = new ValkeySessionRegistry(client as never, 'sdg:');

    await registry.track('user-1', 'sid-1');

    expect(client.sadd).toHaveBeenCalledWith('sdg:user-sessions:user-1', 'sid-1');
  });

  it('Should delete every connect-redis session key and the index set on revokeAll()', async () => {
    const client = makeClient({ 'sdg:user-sessions:user-1': ['sid-1', 'sid-2'] });
    const registry = new ValkeySessionRegistry(client as never, 'sdg:');

    await registry.revokeAll('user-1');

    // Session keys are deleted using the connect-redis prefix (must match session.factory.ts).
    expect(client.del).toHaveBeenCalledWith('sdg:sess:sid-1', 'sdg:sess:sid-2');
    // ...and the per-user index set itself is removed.
    expect(client.del).toHaveBeenCalledWith('sdg:user-sessions:user-1');
  });

  it('Should only clear the (empty) index on revokeAll for a user with no tracked sessions', async () => {
    const client = makeClient();
    const registry = new ValkeySessionRegistry(client as never, 'sdg:');

    await registry.revokeAll('ghost');

    expect(client.del).toHaveBeenCalledTimes(1);
    expect(client.del).toHaveBeenCalledWith('sdg:user-sessions:ghost');
  });

  it('Should namespace keys by the configured prefix (per-app isolation on a shared Valkey)', async () => {
    const client = makeClient({ 'cpa:user-sessions:user-1': ['sid-9'] });
    const registry = new ValkeySessionRegistry(client as never, 'cpa:');

    await registry.track('user-2', 'sid-2');
    expect(client.sadd).toHaveBeenCalledWith('cpa:user-sessions:user-2', 'sid-2');

    await registry.revokeAll('user-1');
    expect(client.del).toHaveBeenCalledWith('cpa:sess:sid-9');
    expect(client.del).toHaveBeenCalledWith('cpa:user-sessions:user-1');
  });
});

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { buildAppSessionOptions } from '../../../src/auth/session.factory';
import Valkey from 'iovalkey';
import { RedisStore } from 'connect-redis';
import { buildSessionOptions } from '@repo/nestjs/auth';

vi.mock('iovalkey', () => {
  return {
    default: vi.fn().mockImplementation(function (this: any, url: string) {
      this.url = url;
      this.ping = vi.fn().mockResolvedValue('PONG');
    }),
  };
});

vi.mock('connect-redis', () => {
  return {
    RedisStore: vi.fn().mockImplementation(function (this: any, opts: any) {
      this.isMockStore = true;
      this.client = opts.client;
      this.prefix = opts.prefix;
    }),
  };
});

vi.mock('@repo/nestjs/auth', () => {
  return {
    buildSessionOptions: vi.fn((opts) => opts),
  };
});

describe('session.factory buildAppSessionOptions Unit Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds session options with memory store (useStore = false)', () => {
    const params = {
      secret: 'test-secret',
      secure: true,
      useStore: false,
      valkeyUrl: 'redis://localhost:6379',
      sessionKeyPrefix: 'cpa:',
    };

    const options = buildAppSessionOptions(params) as any;

    expect(options).toEqual({
      secret: 'test-secret',
      secure: true,
      cookieName: 'cpa.sid',
    });

    expect(Valkey).not.toHaveBeenCalled();
    expect(RedisStore).not.toHaveBeenCalled();
    expect(buildSessionOptions).toHaveBeenCalledWith({
      secret: 'test-secret',
      secure: true,
      cookieName: 'cpa.sid',
    });
  });

  it('builds session options with Valkey/RedisStore (useStore = true)', () => {
    const params = {
      secret: 'another-secret',
      secure: false,
      useStore: true,
      valkeyUrl: 'redis://valkey-host:6379',
      sessionKeyPrefix: 'sdg:sub:',
    };

    const options = buildAppSessionOptions(params) as any;

    expect(Valkey).toHaveBeenCalledWith('redis://valkey-host:6379');
    expect(RedisStore).toHaveBeenCalledWith({
      client: expect.objectContaining({ url: 'redis://valkey-host:6379' }),
      prefix: 'sdg:sub:sess:',
    });

    expect(options.secret).toBe('another-secret');
    expect(options.secure).toBe(false);
    expect(options.cookieName).toBe('sdg:sub.sid');
    expect(options.store).toBeDefined();
    expect((options.store as any).isMockStore).toBe(true);

    expect(buildSessionOptions).toHaveBeenCalledTimes(1);
  });

  it('handles sessionKeyPrefix with multiple trailing colons correctly', () => {
    const params = {
      secret: 'secret',
      secure: true,
      useStore: false,
      valkeyUrl: 'redis://localhost',
      sessionKeyPrefix: 'my-app:::::',
    };

    const options = buildAppSessionOptions(params) as any;
    expect(options.cookieName).toBe('my-app.sid');
  });

  it('handles sessionKeyPrefix without any colons correctly', () => {
    const params = {
      secret: 'secret',
      secure: true,
      useStore: false,
      valkeyUrl: 'redis://localhost',
      sessionKeyPrefix: 'myapp',
    };

    const options = buildAppSessionOptions(params) as any;
    expect(options.cookieName).toBe('myapp.sid');
  });
});

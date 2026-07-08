import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { type Database } from '@repo/database';
import { OidcUserSyncService, mapClaims } from '../../../src/auth/oidc-user-sync.service';

describe('mapClaims Function Unit Test', () => {
  it('maps a full set of claims', () => {
    expect(
      mapClaims({
        sub: 's-1',
        iss: 'https://idp.example.com',
        email: 'a@b.com',
        name: 'A B',
        given_name: 'A',
        family_name: 'B',
      }),
    ).toEqual({
      issuer: 'https://idp.example.com',
      sub: 's-1',
      email: 'a@b.com',
      displayName: 'A B',
      givenName: 'A',
      familyName: 'B',
    });
  });

  it('falls back to empty strings for missing given/family names', () => {
    const m = mapClaims({ sub: 's', iss: 'i', preferred_username: 'puser' });
    expect(m.givenName).toBe('');
    expect(m.familyName).toBe('');
    expect(m.email).toBeUndefined();
  });

  it('derives displayName: name → preferred_username → email → sub', () => {
    expect(mapClaims({ sub: 'x', iss: 'i', name: 'N' }).displayName).toBe('N');
    expect(mapClaims({ sub: 'x', iss: 'i', preferred_username: 'p' }).displayName).toBe('p');
    expect(mapClaims({ sub: 'x', iss: 'i', email: 'e@x' }).displayName).toBe('e@x');
    expect(mapClaims({ sub: 'x', iss: 'i' }).displayName).toBe('x');
  });
});

const createDbMock = () => {
  const txMock = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
  };

  const dbMock = {
    transaction: vi.fn(async (cb: any) => cb(txMock)),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn(),
  };

  return { dbMock, txMock };
};

describe('OidcUserSyncService Unit Test', () => {
  let service: OidcUserSyncService;
  let dbMock: any;
  let txMock: any;
  let configMock: any;

  beforeEach(() => {
    const mocks = createDbMock();
    dbMock = mocks.dbMock;
    txMock = mocks.txMock;

    configMock = {
      getOrThrow: vi.fn().mockReturnValue('citizen'),
    };

    service = new OidcUserSyncService(
      dbMock as unknown as Database,
      configMock as unknown as ConfigService,
    );
  });

  it('should successfully sync and return user when identity already exists (re-login)', async () => {
    const claims = {
      iss: 'https://idp.example.com',
      sub: 'existing-sub',
      email: 'existing@example.com',
      name: 'Existing User',
      given_name: 'Existing',
      family_name: 'User',
    };

    // Mock that identity exists and returns userId
    txMock.limit.mockResolvedValueOnce([{ userId: 'existing-user-uuid' }]);

    // Mock that we can find the user in the users table afterwards
    dbMock.limit.mockResolvedValueOnce([{ id: 'existing-user-uuid', roles: ['citizen'] }]);

    const result = await service.onSignIn(claims);

    // Verify returning user info
    expect(result).toEqual({
      id: 'existing-user-uuid',
      roles: ['citizen'],
      claims,
    });

    // Verify transaction DB interactions
    expect(dbMock.transaction).toHaveBeenCalledTimes(1);
    expect(txMock.select).toHaveBeenCalled();
    expect(txMock.update).toHaveBeenCalled();
    expect(txMock.insert).not.toHaveBeenCalled(); // No user/identity insertions
  });

  it('should successfully sync, create user and identity when identity does not exist (first login)', async () => {
    const claims = {
      iss: 'https://idp.example.com',
      sub: 'new-sub',
      email: 'new@example.com',
      name: 'New User',
      given_name: 'New',
      family_name: 'User',
    };

    // Mock that identity does not exist (returns empty array)
    txMock.limit.mockResolvedValueOnce([]);

    // Mock that inserting a new user returns the new user id
    txMock.returning.mockResolvedValueOnce([{ id: 'new-user-uuid' }]);

    // Mock that we can find the user in the users table afterwards
    dbMock.limit.mockResolvedValueOnce([{ id: 'new-user-uuid', roles: ['citizen'] }]);

    const result = await service.onSignIn(claims);

    // Verify returning user info
    expect(result).toEqual({
      id: 'new-user-uuid',
      roles: ['citizen'],
      claims,
    });

    // Verify transaction DB interactions
    expect(dbMock.transaction).toHaveBeenCalledTimes(1);
    expect(txMock.select).toHaveBeenCalled();
    expect(txMock.insert).toHaveBeenCalledTimes(2); // One for user, one for identity
    expect(txMock.returning).toHaveBeenCalled();
  });

  it('should throw an error if user insertion fails during transaction (first login)', async () => {
    const claims = {
      iss: 'https://idp.example.com',
      sub: 'new-sub',
    };

    // Mock that identity does not exist
    txMock.limit.mockResolvedValueOnce([]);

    // Mock that inserting a new user returns empty array (failed insertion)
    txMock.returning.mockResolvedValueOnce([]);

    await expect(service.onSignIn(claims)).rejects.toThrow('auth sync: failed to create user');
  });

  it('should throw an error if user cannot be found after transaction', async () => {
    const claims = {
      iss: 'https://idp.example.com',
      sub: 'existing-sub',
    };

    // Mock that identity exists
    txMock.limit.mockResolvedValueOnce([{ userId: 'existing-user-uuid' }]);

    // Mock that user lookup after transaction returns undefined
    dbMock.limit.mockResolvedValueOnce([]);

    await expect(service.onSignIn(claims)).rejects.toThrow(
      'auth sync: user not found after upsert',
    );
  });
});

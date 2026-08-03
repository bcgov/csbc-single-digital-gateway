import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mapClaims, OidcUserSyncService } from '../../../src/auth/oidc-user-sync.service';
import { users, identities } from '@repo/database';
import type { OidcClaims } from '@repo/nestjs/auth';

describe('OidcUserSyncService', () => {
  let dbMock: any;
  let txMock: any;
  let configMock: any;
  let service: OidcUserSyncService;

  beforeEach(() => {
    // Reset all mock structures before each test run
    txMock = Object.assign(Promise.resolve([]), {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
    });

    dbMock = {
      transaction: vi.fn().mockImplementation((cb) => cb(txMock)),
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn(),
    };

    configMock = {
      getOrThrow: vi.fn().mockReturnValue('citizen'),
    };

    service = new OidcUserSyncService(dbMock as any, configMock as any);
  });

  const dummyClaims: OidcClaims = {
    sub: 'user-sub-123',
    iss: 'https://idp.example.com',
    email: 'test@example.com',
    name: 'John Doe',
    given_name: 'John',
    family_name: 'Doe',
  };

  it('creates a new user and identity on first login', async () => {
    // 1. First select for existing identity should return empty (not found)
    txMock.limit.mockResolvedValueOnce([]);

    // 2. Insert into users should return the new user's ID
    txMock.returning.mockResolvedValueOnce([{ id: 'new-user-id' }]);

    // 3. Final select from db to retrieve user and their roles
    dbMock.limit.mockResolvedValueOnce([{ id: 'new-user-id', roles: ['citizen'] }]);

    const result = await service.onSignIn(dummyClaims);

    // Verify config is read for default role
    expect(configMock.getOrThrow).toHaveBeenCalledWith('AUTH_DEFAULT_ROLE');

    // Verify user was inserted with the default role
    expect(txMock.insert).toHaveBeenCalledWith(users);
    expect(txMock.values).toHaveBeenNthCalledWith(1, {
      displayName: 'John Doe',
      givenName: 'John',
      familyName: 'Doe',
      email: 'test@example.com',
      roles: ['citizen'],
    });

    // Verify identity was created and linked to the new user ID
    expect(txMock.insert).toHaveBeenCalledWith(identities);
    expect(txMock.values).toHaveBeenNthCalledWith(2, {
      userId: 'new-user-id',
      issuer: 'https://idp.example.com',
      sub: 'user-sub-123',
      displayName: 'John Doe',
      givenName: 'John',
      familyName: 'Doe',
      email: 'test@example.com',
      lastLoginAt: expect.anything(),
    });

    // Verify the return value
    expect(result).toEqual({
      id: 'new-user-id',
      roles: ['citizen'],
      claims: dummyClaims,
    });
  });

  it('updates profile and log-in timestamp for an existing user/identity on subsequent login', async () => {
    // 1. First select for existing identity should find the existing user ID
    txMock.limit.mockResolvedValueOnce([{ userId: 'existing-user-id' }]);

    // 2. Final select from db to retrieve user and roles (roles from DB might be staff, admin, etc.)
    dbMock.limit.mockResolvedValueOnce([{ id: 'existing-user-id', roles: ['staff'] }]);

    const result = await service.onSignIn(dummyClaims);

    // Verify that we update the identity and don't insert a new user
    expect(txMock.update).toHaveBeenCalledWith(identities);
    expect(txMock.set).toHaveBeenCalledWith({
      lastLoginAt: expect.anything(),
      displayName: 'John Doe',
      givenName: 'John',
      familyName: 'Doe',
      email: 'test@example.com',
    });
    expect(txMock.insert).not.toHaveBeenCalled();

    // Verify the return value retains the DB roles (re-login doesn't overwrite roles to default)
    expect(result).toEqual({
      id: 'existing-user-id',
      roles: ['staff'],
      claims: dummyClaims,
    });
  });

  it('throws an error if user insertion fails to return a new user', async () => {
    // 1. First select for existing identity returns empty
    txMock.limit.mockResolvedValueOnce([]);

    // 2. Insert returns undefined or empty array
    txMock.returning.mockResolvedValueOnce([]);

    await expect(service.onSignIn(dummyClaims)).rejects.toThrow('auth sync: failed to create user');
  });

  it('throws an error if user is not found in database after successful upsert', async () => {
    // 1. First select for existing identity returns empty
    txMock.limit.mockResolvedValueOnce([]);

    // 2. Insert returns the new user
    txMock.returning.mockResolvedValueOnce([{ id: 'new-user-id' }]);

    // 3. Select user after upsert returns empty
    dbMock.limit.mockResolvedValueOnce([]);

    await expect(service.onSignIn(dummyClaims)).rejects.toThrow(
      'auth sync: user not found after upsert',
    );
  });

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

  it('falls back to empty string for missing issuer', () => {
    const m = mapClaims({ sub: 's', name: 'N' });
    expect(m.issuer).toBe('');
  });

  it('updates profile with null email if claims do not have an email during subsequent sign in', async () => {
    txMock.limit.mockResolvedValueOnce([{ userId: 'existing-user-id' }]);
    dbMock.limit.mockResolvedValueOnce([{ id: 'existing-user-id', roles: ['citizen'] }]);

    const claimsNoEmail = { sub: 's-123', iss: 'idp', name: 'No Email User' };
    await service.onSignIn(claimsNoEmail);

    expect(txMock.update).toHaveBeenCalledWith(identities);
    expect(txMock.set).toHaveBeenCalledWith({
      lastLoginAt: expect.anything(),
      displayName: 'No Email User',
      givenName: '',
      familyName: '',
      email: null,
    });
  });
});

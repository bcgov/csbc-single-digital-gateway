import { Logger } from '@nestjs/common';
import { type Database, schema } from '@repo/db';
import { UsersService } from '../services/users.service';

type DbMockBundle = {
  db: {
    select: jest.Mock;
    update: jest.Mock;
    transaction: jest.Mock;
  };
  selectLimitMock: jest.Mock;
  updateSetMock: jest.Mock;
  updateWhereMock: jest.Mock;
  txInsertMock: jest.Mock;
  txInsertUserValuesMock: jest.Mock;
  txInsertUserReturningMock: jest.Mock;
  txInsertIdentityValuesMock: jest.Mock;
  txInsertRoleValuesMock: jest.Mock;
};

const createDbMock = (options?: {
  existing?: Array<{ userId?: string }>;
  newUserId?: string;
}): DbMockBundle => {
  const existing = options?.existing ?? [];
  const newUserId = options?.newUserId ?? 'new-user-1';

  const selectLimitMock = jest.fn().mockResolvedValue(existing);
  const selectWhereMock = jest.fn().mockReturnValue({ limit: selectLimitMock });
  const selectFromMock = jest.fn().mockReturnValue({ where: selectWhereMock });
  const selectMock = jest.fn().mockReturnValue({ from: selectFromMock });

  const updateWhereMock = jest.fn().mockResolvedValue(undefined);
  const updateSetMock = jest.fn().mockReturnValue({ where: updateWhereMock });
  const updateMock = jest.fn().mockReturnValue({ set: updateSetMock });

  const txInsertUserReturningMock = jest
    .fn()
    .mockResolvedValue([{ id: newUserId }]);
  const txInsertUserValuesMock = jest.fn().mockReturnValue({
    returning: txInsertUserReturningMock,
  });

  const txInsertIdentityValuesMock = jest.fn().mockResolvedValue(undefined);
  const txInsertRoleValuesMock = jest.fn().mockResolvedValue(undefined);

  const txInsertMock = jest.fn((table: unknown) => {
    if (table === schema.users) {
      return { values: txInsertUserValuesMock };
    }
    if (table === schema.identities) {
      return { values: txInsertIdentityValuesMock };
    }
    if (table === schema.userRoles) {
      return { values: txInsertRoleValuesMock };
    }
    throw new Error('Unexpected table passed to tx.insert');
  });

  const tx = { insert: txInsertMock };

  const transactionMock = jest.fn(async (cb: (txArg: typeof tx) => unknown) => {
    return await cb(tx);
  });

  return {
    db: {
      select: selectMock,
      update: updateMock,
      transaction: transactionMock,
    },
    selectLimitMock,
    updateSetMock,
    updateWhereMock,
    txInsertMock,
    txInsertUserValuesMock,
    txInsertUserReturningMock,
    txInsertIdentityValuesMock,
    txInsertRoleValuesMock,
  };
};

describe('UsersService Unit Test', () => {
  let logSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    debugSpy = jest
      .spyOn(Logger.prototype, 'debug')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    debugSpy.mockRestore();
  });

  it('Should validate that the method syncFromOidc is defined', () => {
    const mocks = createDbMock();
    const service = new UsersService(mocks.db as unknown as Database);

    expect(service).toHaveProperty('syncFromOidc');
  });

  it('Should update claims and return existing userId when identity already exists', async () => {
    const mocks = createDbMock({ existing: [{ userId: 'existing-user-1' }] });
    const service = new UsersService(mocks.db as unknown as Database);

    const result = await service.syncFromOidc(
      'https://issuer.example.com',
      'sub-123',
      { a: 1, identity_provider: 'azureidir' },
      { name: 'Test User', email: 'user@example.com' },
    );

    expect(result).toEqual({ userId: 'existing-user-1' });
    expect(mocks.updateSetMock).toHaveBeenCalledWith({
      claims: { a: 1, identity_provider: 'azureidir' },
    });
    expect(mocks.updateWhereMock).toHaveBeenCalledTimes(1);
    expect(mocks.db.transaction).not.toHaveBeenCalled();
    expect(debugSpy).toHaveBeenCalledWith(
      'Updated identity claims for user existing-user-1',
    );
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('Should create user/identity/role with staff role for azureidir claims', async () => {
    const mocks = createDbMock({ existing: [], newUserId: 'staff-user-1' });
    const service = new UsersService(mocks.db as unknown as Database);

    const claims = {
      sub: 'abc',
      identity_provider: 'azureidir',
      display_name: 'Staff Member',
    };

    const result = await service.syncFromOidc(
      'https://idir.example.com',
      'sub-staff',
      claims,
      { name: 'Staff Member', email: 'staff@example.com' },
    );

    expect(result).toEqual({ userId: 'staff-user-1' });
    expect(mocks.db.transaction).toHaveBeenCalledTimes(1);

    expect(mocks.txInsertUserValuesMock).toHaveBeenCalledWith({
      name: 'Staff Member',
      email: 'staff@example.com',
    });

    expect(mocks.txInsertIdentityValuesMock).toHaveBeenCalledWith({
      userId: 'staff-user-1',
      issuer: 'https://idir.example.com',
      sub: 'sub-staff',
      claims,
    });

    expect(mocks.txInsertRoleValuesMock).toHaveBeenCalledWith({
      userId: 'staff-user-1',
      role: 'staff',
    });

    expect(logSpy).toHaveBeenCalledWith(
      'Created new user staff-user-1 for https://idir.example.com/sub-staff',
    );
    expect(debugSpy).not.toHaveBeenCalled();
  });

  it('Should create user/identity/role with citizen role for non-azureidir claims', async () => {
    const mocks = createDbMock({ existing: [], newUserId: 'citizen-user-1' });
    const service = new UsersService(mocks.db as unknown as Database);

    const claims = {
      sub: 'xyz',
      identity_provider: 'bcsc',
    };

    const result = await service.syncFromOidc(
      'https://bcsc.example.com',
      'sub-citizen',
      claims,
      { name: 'Citizen User', email: 'citizen@example.com' },
    );

    expect(result).toEqual({ userId: 'citizen-user-1' });
    expect(mocks.txInsertRoleValuesMock).toHaveBeenCalledWith({
      userId: 'citizen-user-1',
      role: 'citizen',
    });
  });

  it('Should create a new user when existing identity row has falsy userId', async () => {
    const mocks = createDbMock({
      existing: [{ userId: '' }],
      newUserId: 'created-after-falsy-existing',
    });
    const service = new UsersService(mocks.db as unknown as Database);

    const result = await service.syncFromOidc(
      'https://issuer.example.com',
      'sub-falsy',
      {},
      { name: undefined, email: undefined },
    );

    expect(result).toEqual({ userId: 'created-after-falsy-existing' });
    expect(mocks.db.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.updateSetMock).not.toHaveBeenCalled();
  });

  it('Should propagate error when identity lookup fails', async () => {
    const mocks = createDbMock();
    mocks.selectLimitMock.mockRejectedValueOnce(new Error('Lookup failed'));
    const service = new UsersService(mocks.db as unknown as Database);

    await expect(
      service.syncFromOidc(
        'https://issuer.example.com',
        'sub-err',
        {},
        { name: 'N', email: 'E' },
      ),
    ).rejects.toThrow('Lookup failed');
  });

  it('Should propagate error when transaction fails', async () => {
    const mocks = createDbMock({ existing: [] });
    mocks.db.transaction.mockRejectedValueOnce(new Error('Transaction failed'));
    const service = new UsersService(mocks.db as unknown as Database);

    await expect(
      service.syncFromOidc(
        'https://issuer.example.com',
        'sub-tx-err',
        {},
        { name: 'N', email: 'E' },
      ),
    ).rejects.toThrow('Transaction failed');
  });
});

import {
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { type Database } from '@repo/db';
import { of } from 'rxjs';
import { OrgUnitsService } from '../org-units.service';

const createDbMock = (selectResults: unknown[] = []) => {
  let selectCallIndex = 0;

  const createSelectChain = (result: unknown) => {
    const limitMock = jest.fn().mockResolvedValue(result);
    const offsetMock = jest.fn().mockResolvedValue(result);
    const orderByMock = jest.fn().mockImplementation(() => {
      const chain = {
        limit: jest.fn().mockReturnValue({ offset: offsetMock }),
        offset: offsetMock,
      };
      (chain as Record<string, unknown>).then = (
        resolve: (v: unknown) => void,
        reject: (e: unknown) => void,
      ) => Promise.resolve(result).then(resolve, reject);
      return chain;
    });
    // Make where return object with all possible chain methods, and also be thenable
    const whereMock = jest.fn().mockImplementation(() => {
      const chain = {
        limit: limitMock,
        orderBy: orderByMock,
        returning: jest.fn().mockResolvedValue(result),
      };
      (chain as Record<string, unknown>).then = (
        resolve: (v: unknown) => void,
        reject: (e: unknown) => void,
      ) => Promise.resolve(result).then(resolve, reject);
      return chain;
    });
    const innerJoinMock = jest.fn().mockReturnValue({
      where: whereMock,
      orderBy: orderByMock,
    });
    const fromMock = jest.fn().mockReturnValue({
      where: whereMock,
      innerJoin: innerJoinMock,
      orderBy: orderByMock,
    });
    return { from: fromMock };
  };

  const selectMock = jest.fn().mockImplementation(() => {
    const result =
      selectCallIndex < selectResults.length
        ? selectResults[selectCallIndex]
        : [];
    selectCallIndex++;
    return createSelectChain(result);
  });

  const returningMock = jest.fn();
  const onConflictMock = jest.fn().mockResolvedValue(undefined);
  const valuesMock = jest.fn().mockReturnValue({
    returning: returningMock,
    onConflictDoUpdate: onConflictMock,
  });
  const insertMock = jest.fn().mockReturnValue({ values: valuesMock });

  const deleteReturningMock = jest.fn();
  const deleteWhereMock = jest
    .fn()
    .mockReturnValue({ returning: deleteReturningMock });
  const deleteMock = jest.fn().mockReturnValue({ where: deleteWhereMock });

  return {
    db: { select: selectMock, insert: insertMock, delete: deleteMock },
    selectMock,
    returningMock,
    valuesMock,
    onConflictMock,
    deleteReturningMock,
    insertMock,
  };
};

describe('OrgUnitsService', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  describe('findAll', () => {
    it('should return paginated org units for admin', async () => {
      const rows = [{ id: 'o1', name: 'Org 1' }];
      // Promise.all: first select returns rows, second returns count
      const mocks = createDbMock([rows, [{ count: 1 }]]);
      const service = new OrgUnitsService(
        mocks.db as unknown as Database,
        { get: jest.fn() } as never,
        {} as never,
      );

      const result = await service.findAll(1, 10, {
        userId: 'u1',
        isGlobalAdmin: true,
      });

      expect(result.data).toEqual(rows);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('findById', () => {
    it('should return org unit when found', async () => {
      const orgUnit = { id: 'o1', name: 'Org 1', type: 'ministry' };
      const mocks = createDbMock([[orgUnit]]);
      const service = new OrgUnitsService(
        mocks.db as unknown as Database,
        { get: jest.fn() } as never,
        {} as never,
      );

      const result = await service.findById('o1');
      expect(result).toEqual(orgUnit);
    });

    it('should throw NotFoundException when not found', async () => {
      const mocks = createDbMock([[]]);
      const service = new OrgUnitsService(
        mocks.db as unknown as Database,
        { get: jest.fn() } as never,
        {} as never,
      );

      await expect(service.findById('o1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMembers', () => {
    it('should return members for org unit', async () => {
      const members = [{ userId: 'u1', role: 'admin', name: 'Test' }];
      const mocks = createDbMock([members]);
      const service = new OrgUnitsService(
        mocks.db as unknown as Database,
        { get: jest.fn() } as never,
        {} as never,
      );

      const result = await service.getMembers('o1');
      expect(result).toEqual(members);
    });
  });

  describe('addMemberById', () => {
    it('should throw NotFoundException when org not found', async () => {
      const mocks = createDbMock([[]]);
      const service = new OrgUnitsService(
        mocks.db as unknown as Database,
        { get: jest.fn() } as never,
        {} as never,
      );

      await expect(
        service.addMemberById('o1', 'u1', 'member'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when user not found', async () => {
      // findById: org found. User lookup: not found
      const mocks = createDbMock([
        [{ id: 'o1', name: 'Org', type: 'ministry' }],
        [],
      ]);
      const service = new OrgUnitsService(
        mocks.db as unknown as Database,
        { get: jest.fn() } as never,
        {} as never,
      );

      await expect(
        service.addMemberById('o1', 'u1', 'member'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return membership on success', async () => {
      const mocks = createDbMock([
        [{ id: 'o1', name: 'Org', type: 'ministry' }],
        [{ id: 'u1' }],
      ]);
      mocks.valuesMock.mockResolvedValue(undefined);
      const service = new OrgUnitsService(
        mocks.db as unknown as Database,
        { get: jest.fn() } as never,
        {} as never,
      );

      const result = await service.addMemberById('o1', 'u1', 'admin');
      expect(result).toEqual({ orgUnitId: 'o1', userId: 'u1', role: 'admin' });
    });

    it('should throw ConflictException on duplicate', async () => {
      const mocks = createDbMock([
        [{ id: 'o1', name: 'Org', type: 'ministry' }],
        [{ id: 'u1' }],
      ]);
      mocks.valuesMock.mockImplementation(() => {
        throw new Error('unique constraint');
      });
      const service = new OrgUnitsService(
        mocks.db as unknown as Database,
        { get: jest.fn() } as never,
        {} as never,
      );

      await expect(
        service.addMemberById('o1', 'u1', 'member'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('removeMember', () => {
    it('should throw NotFoundException when member not found', async () => {
      const mocks = createDbMock();
      mocks.deleteReturningMock.mockResolvedValue([]);
      const service = new OrgUnitsService(
        mocks.db as unknown as Database,
        { get: jest.fn() } as never,
        {} as never,
      );

      await expect(service.removeMember('o1', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return removed on success', async () => {
      const mocks = createDbMock();
      mocks.deleteReturningMock.mockResolvedValue([{ orgUnitId: 'o1' }]);
      const service = new OrgUnitsService(
        mocks.db as unknown as Database,
        { get: jest.fn() } as never,
        {} as never,
      );

      const result = await service.removeMember('o1', 'u1');
      expect(result).toEqual({ removed: true });
    });
  });

  describe('getChildren', () => {
    it('should return children', async () => {
      const children = [{ id: 'c1', name: 'Child' }];
      const mocks = createDbMock([children]);
      const service = new OrgUnitsService(
        mocks.db as unknown as Database,
        { get: jest.fn() } as never,
        {} as never,
      );

      const result = await service.getChildren('o1');
      expect(result).toEqual(children);
    });
  });

  describe('getAllowedChildTypes', () => {
    it('should return allowed types for ministry', async () => {
      const mocks = createDbMock([
        [{ id: 'o1', name: 'Ministry', type: 'ministry' }],
      ]);
      const service = new OrgUnitsService(
        mocks.db as unknown as Database,
        { get: jest.fn() } as never,
        {} as never,
      );

      const result = await service.getAllowedChildTypes('o1');
      expect(result).toEqual(['division', 'team']);
    });

    it('should return empty for team', async () => {
      const mocks = createDbMock([
        [{ id: 'o1', name: 'Team', type: 'team' }],
      ]);
      const service = new OrgUnitsService(
        mocks.db as unknown as Database,
        { get: jest.fn() } as never,
        {} as never,
      );

      const result = await service.getAllowedChildTypes('o1');
      expect(result).toEqual([]);
    });
  });

  describe('createChild', () => {
    it('should throw BadRequestException for invalid child type', async () => {
      const mocks = createDbMock([
        [{ id: 'o1', name: 'Team', type: 'team' }],
      ]);
      const service = new OrgUnitsService(
        mocks.db as unknown as Database,
        { get: jest.fn() } as never,
        {} as never,
      );

      await expect(
        service.createChild('o1', 'Sub Team', 'division' as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create child and closure entries', async () => {
      const mocks = createDbMock([
        // findById returns parent
        [{ id: 'o1', name: 'Ministry', type: 'ministry' }],
        // ancestor rows query
        [{ ancestorId: 'root', depth: 1 }],
      ]);
      // First insert returns child, second insert returns closure entries
      mocks.returningMock
        .mockResolvedValueOnce([
          { id: 'c1', name: 'Div', type: 'division' },
        ]);

      const service = new OrgUnitsService(
        mocks.db as unknown as Database,
        { get: jest.fn() } as never,
        {} as never,
      );

      const result = await service.createChild(
        'o1',
        'Div',
        'division' as never,
      );
      expect(result).toEqual({ id: 'c1', name: 'Div', type: 'division' });
    });
  });

  describe('isAncestorAdmin', () => {
    it('should return true when user is ancestor admin', async () => {
      const mocks = createDbMock([[{ role: 'admin' }]]);
      const service = new OrgUnitsService(
        mocks.db as unknown as Database,
        { get: jest.fn() } as never,
        {} as never,
      );

      const result = await service.isAncestorAdmin('o1', 'u1');
      expect(result).toBe(true);
    });

    it('should return false when user is not ancestor admin', async () => {
      const mocks = createDbMock([[]]);
      const service = new OrgUnitsService(
        mocks.db as unknown as Database,
        { get: jest.fn() } as never,
        {} as never,
      );

      const result = await service.isAncestorAdmin('o1', 'u1');
      expect(result).toBe(false);
    });
  });

  describe('syncMinistries', () => {
    it('should sync ministries from API', async () => {
      const mocks = createDbMock();
      const configService = {
        get: jest.fn().mockReturnValue('https://api.example.com/bodies'),
      };
      const httpService = {
        get: jest.fn().mockReturnValue(
          of({
            data: {
              payload: [
                {
                  id: 'm1',
                  name: 'Ministry of Health',
                  publicBodyType: { code: 'BC Government Ministry' },
                  retirementDate: null,
                },
                {
                  id: 'm2',
                  name: 'Retired Ministry',
                  publicBodyType: { code: 'BC Government Ministry' },
                  retirementDate: '2024-01-01',
                },
                {
                  id: 'm3',
                  name: 'Crown Corp',
                  publicBodyType: { code: 'Crown Corporation' },
                  retirementDate: null,
                },
              ],
            },
          }),
        ),
      };

      mocks.onConflictMock.mockResolvedValue(undefined);

      const service = new OrgUnitsService(
        mocks.db as unknown as Database,
        configService as never,
        httpService as never,
      );

      const result = await service.syncMinistries();
      expect(result).toEqual({ synced: 1 });
      expect(mocks.insertMock).toHaveBeenCalledTimes(1);
    });
  });
});

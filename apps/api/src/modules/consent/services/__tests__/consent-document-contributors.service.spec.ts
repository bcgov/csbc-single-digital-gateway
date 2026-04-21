import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { type Database } from '@repo/db';
import { ConsentDocumentContributorsService } from '../consent-document-contributors.service';

const createDbMock = (selectResults: unknown[] = []) => {
  let selectCallIndex = 0;

  const createSelectChain = (result: unknown) => {
    const limitMock = jest.fn().mockResolvedValue(result);
    const whereMock = jest.fn().mockImplementation(() => {
      const chain = { limit: limitMock };
      (chain as Record<string, unknown>).then = (
        resolve: (v: unknown) => void,
        reject: (e: unknown) => void,
      ) => Promise.resolve(result).then(resolve, reject);
      return chain;
    });
    const innerJoinMock = jest.fn().mockReturnValue({ where: whereMock });
    const fromMock = jest.fn().mockReturnValue({
      where: whereMock,
      innerJoin: innerJoinMock,
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
  const valuesMock = jest.fn().mockReturnValue({ returning: returningMock });
  const insertMock = jest.fn().mockReturnValue({ values: valuesMock });

  const deleteWhereMock = jest.fn().mockResolvedValue(undefined);
  const deleteMock = jest.fn().mockReturnValue({ where: deleteWhereMock });

  return {
    db: { select: selectMock, insert: insertMock, delete: deleteMock },
    returningMock,
    valuesMock,
  };
};

describe('ConsentDocumentContributorsService', () => {
  it('findByDocument should return contributors', async () => {
    const expected = [{ userId: 'u1', role: 'owner', name: 'Test' }];
    const mocks = createDbMock([expected]);
    const service = new ConsentDocumentContributorsService(
      mocks.db as unknown as Database,
    );

    const result = await service.findByDocument('d1');
    expect(result).toEqual(expected);
  });

  it('addContributor should return result on success', async () => {
    const mocks = createDbMock();
    mocks.returningMock.mockResolvedValue([
      { consentDocumentId: 'd1', userId: 'u1', role: 'owner' },
    ]);
    const service = new ConsentDocumentContributorsService(
      mocks.db as unknown as Database,
    );

    const result = await service.addContributor('d1', 'u1', 'owner');
    expect(result).toEqual({
      consentDocumentId: 'd1',
      userId: 'u1',
      role: 'owner',
    });
  });

  it('addContributor should throw ConflictException on duplicate', async () => {
    const mocks = createDbMock();
    mocks.returningMock.mockRejectedValue(new Error('duplicate key'));
    const service = new ConsentDocumentContributorsService(
      mocks.db as unknown as Database,
    );

    await expect(service.addContributor('d1', 'u1', 'owner')).rejects.toThrow(
      ConflictException,
    );
  });

  it('addContributor should rethrow non-duplicate errors', async () => {
    const mocks = createDbMock();
    mocks.returningMock.mockRejectedValue(new Error('connection error'));
    const service = new ConsentDocumentContributorsService(
      mocks.db as unknown as Database,
    );

    await expect(service.addContributor('d1', 'u1', 'owner')).rejects.toThrow(
      'connection error',
    );
  });

  it('removeContributor should throw NotFoundException when not found', async () => {
    const mocks = createDbMock([[]]);
    const service = new ConsentDocumentContributorsService(
      mocks.db as unknown as Database,
    );

    await expect(service.removeContributor('d1', 'u1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('removeContributor should throw BadRequestException when removing last owner', async () => {
    const mocks = createDbMock([[{ role: 'owner' }], [{ count: 1 }]]);
    const service = new ConsentDocumentContributorsService(
      mocks.db as unknown as Database,
    );

    await expect(service.removeContributor('d1', 'u1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('removeContributor should succeed when removing non-owner', async () => {
    const mocks = createDbMock([[{ role: 'contributor' }]]);
    const service = new ConsentDocumentContributorsService(
      mocks.db as unknown as Database,
    );

    const result = await service.removeContributor('d1', 'u1');
    expect(result).toEqual({ removed: true });
  });

  it('removeContributor should succeed when removing owner with other owners', async () => {
    const mocks = createDbMock([[{ role: 'owner' }], [{ count: 2 }]]);
    const service = new ConsentDocumentContributorsService(
      mocks.db as unknown as Database,
    );

    const result = await service.removeContributor('d1', 'u1');
    expect(result).toEqual({ removed: true });
  });

  it('getContributorRole should return role when found', async () => {
    const mocks = createDbMock([[{ role: 'owner' }]]);
    const service = new ConsentDocumentContributorsService(
      mocks.db as unknown as Database,
    );

    const result = await service.getContributorRole('d1', 'u1');
    expect(result).toBe('owner');
  });

  it('getContributorRole should return null when not found', async () => {
    const mocks = createDbMock([[]]);
    const service = new ConsentDocumentContributorsService(
      mocks.db as unknown as Database,
    );

    const result = await service.getContributorRole('d1', 'u1');
    expect(result).toBeNull();
  });
});

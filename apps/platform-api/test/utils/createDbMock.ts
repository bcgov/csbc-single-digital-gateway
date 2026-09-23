import { vi } from 'vitest';

/**
 * Creates a mock Drizzle database instance with query mocking capabilities.
 *
 * @returns An object containing the mock database instance (`builderMock`), a query mock setup function
 * (`mockResponse`), and a transaction mock (`txMock`).
 *
 * @example
 * ```typescript
 * import { createMockDb } from '../../utils/createMockDb';
 *
 * const { builderMock, mockResponse } = createMockDb();
 *
 * mockResponse({ rows: [{ id: 1 }] }, 'users', 'select');
 * const result = await builderMock.select().from('users').where({ id: 1 });
 * // result is { rows: [{ id: 1 }] }
 * ```
 */
export const createMockDb = () => {
  /**
   * A mock Drizzle transaction object.
   */
  const txMock: any = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    innerJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    onConflictDoNothing: vi.fn().mockReturnThis(),
  };

  /**
   * A mock Drizzle database instance.
   */
  const dbMock: any = {
    transaction: vi.fn(async (cb: any) => cb(txMock)),
    select: vi.fn().mockReturnThis(),
    selectDistinct: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    innerJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    onConflictDoNothing: vi.fn().mockReturnThis(),
  };

  /**
   * A mock Drizzle query builder instance.
   */
  const mocks: {
    queries: Array<{
      table?: any;
      action?: 'select' | 'insert' | 'update' | undefined;
      resolve: any;
    }>;
  } = {
    queries: [],
  };

  /**
   * Creates a mock Drizzle query builder instance.
   *
   * @returns A mock Drizzle query builder instance.
   */
  const createBuilder = () => {
    let activeTable: any = null;
    let action: 'select' | 'insert' | 'update' = 'select';

    const builder = {
      select: vi.fn().mockImplementation(() => {
        action = 'select';
        return builder;
      }),
      insert: vi.fn().mockImplementation((table) => {
        action = 'insert';
        activeTable = table;
        return builder;
      }),
      update: vi.fn().mockImplementation((table) => {
        action = 'update';
        activeTable = table;
        return builder;
      }),
      from: vi.fn().mockImplementation((table) => {
        activeTable = table;
        return builder;
      }),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      onConflictDoNothing: vi.fn().mockReturnThis(),
      // eslint-disable-next-line unicorn/no-thenable -- Drizzle ORM queries are thenables; the mock must implement .then() to support direct await
      then: (onfulfilled: any) => {
        const index = mocks.queries.findIndex(
          (q) =>
            (q.table === undefined || q.table === activeTable) &&
            (q.action === undefined || q.action === action),
        );
        let result: any = [];
        if (index !== -1) {
          const entry = mocks.queries[index];
          if (entry !== undefined) {
            result = entry.resolve;
            mocks.queries.splice(index, 1);
          }
        }
        return Promise.resolve(result).then(onfulfilled);
      },
    };
    return builder;
  };

  /**
   * Mock Drizzle query builder instance that also includes a transaction mock.
   */
  const builderMock = {
    ...createBuilder(),
    transaction: vi.fn(async (cb: any) => {
      return cb(createBuilder());
    }),
    select: vi.fn().mockImplementation(() => createBuilder()),
    selectDistinct: vi.fn().mockImplementation(() => createBuilder()),
  };

  /**
   * Mocks a database query by adding it to the `mocks.queries` array.
   *
   * @param resolve The response to return when the query is executed.
   * @param table (Optional) The table name to match the query against. Defaults to undefined.
   * @param action (Optional) The action type ('select', 'insert', or 'update') to match the query against.
   *        Defaults to undefined.
   */
  const mockResponse = (resolve: any, table?: any, action?: 'select' | 'insert' | 'update') => {
    mocks.queries.push({ table, action, resolve });
  };

  return { txMock, dbMock, builderMock, mockResponse };
};

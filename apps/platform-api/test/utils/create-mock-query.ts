import { vi } from 'vitest';

/**
 * Create a mock query builder that can be used to mock database queries.
 * @param resolvedValue - The value to be returned when the query is executed.
 * @returns A mock query builder with mock methods.
 */
export const createMockQuery = (resolvedValue: any) => {
  const qb = Promise.resolve(resolvedValue);
  return Object.assign(qb, {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnValue(qb),
    for: vi.fn().mockResolvedValue(resolvedValue),
  });
};

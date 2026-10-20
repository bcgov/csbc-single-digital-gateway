import type { Request } from 'express';
import { vi } from 'vitest';

/**
 * Creates a mock Express Request object for testing purposes.
 * @param overrides - Optional overrides for the default request object.
 * @returns A mock Express Request object.
 */
export const createMockReq = (overrides: Partial<Request> & Record<string, unknown> = {}) =>
  ({
    on: vi.fn(),
    headers: {},
    query: {},
    params: {},
    body: {},
    ...overrides,
  }) as unknown as Request;

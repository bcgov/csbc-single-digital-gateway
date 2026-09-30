import type { Response } from 'express';
import { vi } from 'vitest';

/**
 * Creates a mock Express Response object for testing purposes.
 * @param overrides - Optional overrides for the default Response object.
 * @returns A mock Express Response object.
 */
export const createMockRes = (overrides: Partial<Response> & Record<string, unknown> = {}) =>
  ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    end: vi.fn(),
    setHeader: vi.fn().mockReturnThis(),
    getHeader: vi.fn(),
    set: vi.fn(),
    flushHeaders: vi.fn(),
    write: vi.fn(),
    locals: {},
    ...overrides,
  }) as unknown as Response;

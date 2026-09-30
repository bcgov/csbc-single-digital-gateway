import { type AuthUser } from '@repo/nestjs/auth';

/**
 * Creates a mock AuthUser object for testing purposes.
 * @param overrides - Optional overrides for the default user object.
 * @returns A mock AuthUser object.
 */
export const createMockUser = (overrides: Partial<AuthUser> = {}) =>
  ({ id: 'user-123', ...overrides }) as unknown as AuthUser;

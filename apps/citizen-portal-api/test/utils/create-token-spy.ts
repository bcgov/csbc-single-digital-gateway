import { vi } from 'vitest';
import { M2mTokenClient } from '../../src/notifications/m2m-token.client';

/**
 * Spy on M2mTokenClient prototype methods so we mock their HTTP/OIDC requests
 * @returns {object} - Object containing the spies
 * @returns {Spy} return.getTokenSpy - Spy on getToken method
 * @returns {Spy} return.invalidateSpy - Spy on invalidate method
 */
export const createTokenSpy = (getTokenSpy: any, invalidateSpy: any) => {
  getTokenSpy = vi.spyOn(M2mTokenClient.prototype, 'getToken').mockResolvedValue('mocked-token');
  invalidateSpy = vi.spyOn(M2mTokenClient.prototype, 'invalidate').mockImplementation(() => {});
  return { getTokenSpy, invalidateSpy };
};

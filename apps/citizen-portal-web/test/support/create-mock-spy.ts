import { vi } from 'vitest';

/**
 * Creates a mock for globalThis.fetch and assigns it to globalThis.fetch.
 * This is useful for testing components that use fetch to make HTTP requests.
 * @param {unknown} [responseJson] - The JSON response to return from fetch.
 * @param {number} [status] - The status code to return from fetch.
 * @returns {vi.SpyInstance} The mock function for globalThis.fetch.
 */
export const createMockSpy = (
  responseJson?: Record<string, unknown> | null,
  status?: number,
): ReturnType<typeof vi.spyOn> => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: status ? status === 200 : true,
    status: status || 200,
    json: async () => responseJson,
  } as Response);
  return fetchSpy;
};

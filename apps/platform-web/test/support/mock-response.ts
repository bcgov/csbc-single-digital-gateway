/**
 * Mock Response object for testing.
 * @param status The HTTP status code.
 * @param data The data to be returned as JSON.
 * @param okState Whether the response should be considered OK.
 * @returns A mock Response object.
 */
export const mockResponse = (status: number, data: any, okState = true) => {
  return {
    ok: okState,
    status,
    json: () => Promise.resolve(data),
  } as Response;
};

export type MockResponseOverrides = Partial<Omit<Response, 'body' | 'json' | 'text'>> & {
  body?: unknown;
  json?: (() => Promise<unknown>) | any;
  text?: (() => Promise<string>) | any;
  [key: string]: unknown;
};

/**
 * Creates a mock Fetch API Response object for testing purposes.
 * @param overrides - Optional overrides for the default response object.
 * @returns A mock Response object.
 */
export const createMockResponse = (overrides: MockResponseOverrides = {}) => {
  return {
    ok: true,
    status: 200,
    body: null,
    json: async () => ({}),
    text: async () => '',
    ...overrides,
  } as unknown as Response;
};

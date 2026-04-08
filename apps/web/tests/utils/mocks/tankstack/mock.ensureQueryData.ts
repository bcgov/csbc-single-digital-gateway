/**
 * This file mocks the `ensureQueryData` function from the TanStack React Query library for testing purposes.
 * It uses Jest to create a mock function that can be used in tests to verify that `ensureQueryData` is called with the correct arguments.
 */
export const mockedEnsureQueryData = jest.fn();

jest.mock("src/lib/react-query.client", () => ({
  queryClient: {
    ensureQueryData: (...args: unknown[]) =>
      mockedEnsureQueryData(...(args as [unknown])),
  },
}));

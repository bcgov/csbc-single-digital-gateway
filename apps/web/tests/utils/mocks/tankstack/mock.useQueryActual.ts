/**
 * This file mocks the `useQuery` hook with the actual implementation from the TanStack React
 * Query library for testing purposes. It allows tests to control the behavior of `useQuery`
 * by providing a mock implementation.
 */
export const mockUseQueryForActual = jest.fn();

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");
  return {
    ...actual,
    useQuery: (...args: unknown[]) => mockUseQueryForActual(...args),
  };
});

export const mockedUseQueryActual = mockUseQueryForActual;

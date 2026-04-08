/**
 * This file mocks the `useQuery` hook from the TanStack React Query library for testing purposes.
 * It allows tests to control the behavior of `useQuery` by providing a mock implementation.
 */
import { useQuery } from "@tanstack/react-query";

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
}));

export const mockedUseQuery = useQuery as jest.Mock;

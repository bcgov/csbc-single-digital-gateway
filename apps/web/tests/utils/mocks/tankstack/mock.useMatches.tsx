/**
 * This file mocks the `useMatches` hook from the TanStack React Router library for testing purposes.
 * It provides a mock implementation of the `useMatches` hook that can be used in tests to simulate
 * route matching behavior. The mock also includes a simple implementation of the `Link` component
 * that renders an anchor tag with the appropriate attributes for testing link behavior.
 */
import { useMatches } from "@tanstack/react-router";

jest.mock("@tanstack/react-router", () => {
  return {
    useMatches: jest.fn(),
    Link: ({
      to,
      params,
      children,
    }: {
      to: string;
      params?: Record<string, string>;
      children?: React.ReactNode;
    }) => (
      <a href={to} data-to={to} data-params={JSON.stringify(params)}>
        {children}
      </a>
    ),
  };
});

export const mockedUseMatches = useMatches as jest.Mock;

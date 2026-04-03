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

export const mockUseMatches = useMatches as jest.Mock;

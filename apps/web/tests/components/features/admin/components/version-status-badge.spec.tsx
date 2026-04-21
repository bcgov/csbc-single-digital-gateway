import { cleanup, render, screen } from "@testing-library/react";

jest.mock("@repo/ui", () => ({
  Badge: ({
    variant,
    className,
    children,
  }: {
    variant?: string;
    className?: string;
    children?: React.ReactNode;
  }) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

import { VersionStatusBadge } from "src/features/admin/components/version-status-badge.component";

describe("VersionStatusBadge", () => {
  afterEach(cleanup);

  it("Should render draft with outline variant", () => {
    render(<VersionStatusBadge status="draft" />);
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveTextContent("draft");
    expect(badge).toHaveAttribute("data-variant", "outline");
  });

  it("Should render published with default variant", () => {
    render(<VersionStatusBadge status="published" />);
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveTextContent("published");
    expect(badge).toHaveAttribute("data-variant", "default");
  });

  it("Should render archived with secondary variant", () => {
    render(<VersionStatusBadge status="archived" />);
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveTextContent("archived");
    expect(badge).toHaveAttribute("data-variant", "secondary");
  });
});

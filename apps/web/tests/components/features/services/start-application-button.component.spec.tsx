import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { ServiceDto } from "src/features/services/service.dto";

jest.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    className,
  }: {
    to: string;
    params?: Record<string, string>;
    children?: ReactNode;
    className?: string;
  }) => {
    let href = to;
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        href = href.replace(`$${key}`, String(value));
      }
    }
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  },
}));

jest.mock("@tabler/icons-react", () => ({
  IconPlayerPlay: ({
    size,
    stroke,
    "aria-hidden": ariaHidden,
  }: {
    size?: number;
    stroke?: number;
    "aria-hidden"?: boolean | "true" | "false";
  }) => (
    <svg
      data-testid="icon-player-play"
      data-size={size}
      data-stroke={stroke}
      aria-hidden={ariaHidden}
    />
  ),
}));

jest.mock("@repo/ui", () => {
  const Button = ({
    children,
    variant,
    size,
  }: {
    children?: ReactNode;
    variant?: string;
    size?: string;
  }) => (
    <button data-testid="ui-button" data-variant={variant} data-size={size}>
      {children}
    </button>
  );
  const buttonVariants = ({
    variant,
    size,
  }: { variant?: string; size?: string } = {}) =>
    `ui-button-variants variant-${variant ?? ""} size-${size ?? ""}`;
  const DropdownMenu = ({ children }: { children?: ReactNode }) => (
    <div data-testid="dropdown-menu">{children}</div>
  );
  const DropdownMenuTrigger = ({ children }: { children?: ReactNode }) => (
    <div data-testid="dropdown-menu-trigger">{children}</div>
  );
  const DropdownMenuContent = ({ children }: { children?: ReactNode }) => (
    <div data-testid="dropdown-menu-content">{children}</div>
  );
  const DropdownMenuItem = ({ children }: { children?: ReactNode }) => (
    <div data-testid="dropdown-menu-item">{children}</div>
  );
  return {
    Button,
    buttonVariants,
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
  };
});

import { StartApplicationButton } from "src/features/services/components/start-application-button.component";

const SERVICE_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const APP_ID_1 = "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";
const APP_ID_2 = "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33";
const APP_ID_3 = "d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44";

const buildService = (applications: unknown): ServiceDto =>
  ({
    id: SERVICE_ID,
    name: "Test service",
    createdAt: "2026-04-22T12:00:00.000Z",
    updatedAt: "2026-04-22T12:00:00.000Z",
    content: applications === undefined ? undefined : { applications },
  }) as unknown as ServiceDto;

describe("StartApplicationButton", () => {
  afterEach(() => {
    cleanup();
  });

  describe("when service has zero applications", () => {
    it("Should render nothing when content.applications is an empty array", () => {
      const { container } = render(
        <StartApplicationButton service={buildService([])} />,
      );

      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(screen.queryByTestId("dropdown-menu")).not.toBeInTheDocument();
    });

    it("Should render nothing when content.applications is undefined", () => {
      const { container } = render(
        <StartApplicationButton service={buildService(undefined)} />,
      );

      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(screen.queryByTestId("dropdown-menu")).not.toBeInTheDocument();
    });
  });

  describe("when service has exactly one application", () => {
    const oneApp = [{ id: APP_ID_1, type: "workflow", label: "Apply online" }];

    it("Should render a single Link styled as the primary CTA with copy 'Start online application'", () => {
      render(<StartApplicationButton service={buildService(oneApp)} />);

      const link = screen.getByRole("link", {
        name: /start online application/i,
      });
      expect(link).toBeInTheDocument();
      expect(link).toHaveClass(
        "ui-button-variants",
        "variant-default",
        "size-default",
      );
      expect(screen.getAllByRole("link")).toHaveLength(1);
    });

    it("Should navigate to /app/services/$serviceId/apply/$applicationId with the service id and the ServiceApplicationDto id", () => {
      render(<StartApplicationButton service={buildService(oneApp)} />);

      const link = screen.getByRole("link", {
        name: /start online application/i,
      });
      expect(link).toHaveAttribute(
        "href",
        `/app/services/${SERVICE_ID}/apply/${APP_ID_1}`,
      );
    });

    it("Should render the IconPlayerPlay icon inside the trigger", () => {
      render(<StartApplicationButton service={buildService(oneApp)} />);

      const icon = screen.getByTestId("icon-player-play");
      const link = screen.getByRole("link");
      expect(icon).toBeInTheDocument();
      expect(link).toContainElement(icon);
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });

    it("Should NOT render a DropdownMenu trigger", () => {
      render(<StartApplicationButton service={buildService(oneApp)} />);

      expect(screen.queryByTestId("dropdown-menu")).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("dropdown-menu-trigger"),
      ).not.toBeInTheDocument();
    });
  });

  describe("when service has more than one application", () => {
    const threeApps = [
      { id: APP_ID_1, type: "workflow", label: "Apply online" },
      { id: APP_ID_2, type: "external", label: "Apply by mail" },
      { id: APP_ID_3, type: "external", label: "Apply in person" },
    ];

    it("Should render a DropdownMenu trigger with copy 'Start online application'", () => {
      render(<StartApplicationButton service={buildService(threeApps)} />);

      const trigger = screen.getByTestId("dropdown-menu-trigger");
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveTextContent(/start online application/i);
      expect(screen.getByTestId("ui-button")).toBeInTheDocument();
    });

    it("Should render one DropdownMenuItem per ServiceApplicationDto, labeled with its .label", () => {
      render(<StartApplicationButton service={buildService(threeApps)} />);

      const items = screen.getAllByTestId("dropdown-menu-item");
      expect(items).toHaveLength(3);
      expect(items[0]).toHaveTextContent("Apply online");
      expect(items[1]).toHaveTextContent("Apply by mail");
      expect(items[2]).toHaveTextContent("Apply in person");
    });

    it("Should link each DropdownMenuItem to /app/services/$serviceId/apply/$applicationId with the matching ServiceApplicationDto id", () => {
      render(<StartApplicationButton service={buildService(threeApps)} />);

      const items = screen.getAllByTestId("dropdown-menu-item");
      const hrefs = items.map((item) =>
        item.querySelector("a")?.getAttribute("href"),
      );

      expect(hrefs).toEqual([
        `/app/services/${SERVICE_ID}/apply/${APP_ID_1}`,
        `/app/services/${SERVICE_ID}/apply/${APP_ID_2}`,
        `/app/services/${SERVICE_ID}/apply/${APP_ID_3}`,
      ]);
    });

    it("Should NOT render the single-Link form of the CTA", () => {
      render(<StartApplicationButton service={buildService(threeApps)} />);

      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(3);
      for (const link of links) {
        expect(link).not.toHaveClass("ui-button-variants");
      }
    });
  });
});

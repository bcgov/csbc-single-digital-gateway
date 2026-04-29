import { cleanup, render, screen } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import type { EnrichedApplicationDto } from "src/features/services/application.dto";
import type { ServiceApplicationDto } from "src/features/services/service.dto";

jest.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    className,
    ...rest
  }: {
    to: string;
    params?: Record<string, string>;
    children?: ReactNode;
    className?: string;
  } & Record<string, unknown>) => {
    let href = to;
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        href = href.replace(`$${key}`, String(value));
      }
    }
    return (
      <a href={href} className={className} {...rest}>
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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  const Button = ({
    children,
    variant,
    size,
    ...rest
  }: {
    children?: ReactNode;
    variant?: string;
    size?: string;
  } & Record<string, unknown>) => (
    <button
      data-testid="ui-button"
      data-variant={variant}
      data-size={size}
      {...rest}
    >
      {children}
    </button>
  );
  const DropdownMenu = ({ children }: { children?: ReactNode }) => (
    <div data-testid="dropdown-menu">{children}</div>
  );
  const DropdownMenuTrigger = ({
    children,
    render: renderEl,
  }: {
    children?: ReactNode;
    render?: ReactElement;
  }) => {
    if (renderEl) {
      const props = {
        "data-testid": "dropdown-menu-trigger",
      } as Record<string, unknown>;
      return children !== undefined
        ? React.cloneElement(renderEl, props, children)
        : React.cloneElement(renderEl, props);
    }
    return <div data-testid="dropdown-menu-trigger">{children}</div>;
  };
  const DropdownMenuContent = ({ children }: { children?: ReactNode }) => (
    <div data-testid="dropdown-menu-content">{children}</div>
  );
  const DropdownMenuItem = ({
    children,
    render: renderEl,
  }: {
    children?: ReactNode;
    render?: ReactElement;
  }) => {
    if (renderEl) {
      const props = {
        "data-testid": "dropdown-menu-item",
      } as Record<string, unknown>;
      return children !== undefined
        ? React.cloneElement(renderEl, props, children)
        : React.cloneElement(renderEl, props);
    }
    return <div data-testid="dropdown-menu-item">{children}</div>;
  };
  const DropdownMenuSeparator = () => (
    <div data-testid="dropdown-menu-separator" />
  );
  return {
    Button,
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
  };
});

import { ResumeApplicationButton } from "src/features/services/components/resume-application-button.component";

const SERVICE_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const TYPE_ID = "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";
const APP_ID_NEWEST = "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33";
const APP_ID_MID = "d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44";
const APP_ID_OLD = "e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55";

const applicationType: ServiceApplicationDto = {
  id: TYPE_ID,
  type: "workflow",
  label: "Apply online",
} as ServiceApplicationDto;

const buildApp = (
  id: string,
  title: string,
  createdAt: string,
): EnrichedApplicationDto =>
  ({
    id,
    serviceId: SERVICE_ID,
    serviceVersionId: "ffffffff-ffff-ffff-ffff-ffffffffffff",
    serviceVersionTranslationId: "ffffffff-ffff-ffff-ffff-fffffffffffe",
    serviceApplicationId: TYPE_ID,
    serviceApplicationType: "workflow",
    userId: "ffffffff-ffff-ffff-ffff-fffffffffffd",
    delegateUserId: null,
    metadata: {},
    serviceTitle: "Service",
    serviceApplicationTitle: title,
    createdAt,
    updatedAt: createdAt,
  }) as EnrichedApplicationDto;

describe("ResumeApplicationButton", () => {
  afterEach(() => {
    cleanup();
  });

  describe("when the user has exactly one application", () => {
    const apps = [buildApp(APP_ID_NEWEST, "Tax return", "2026-04-22T12:00:00Z")];

    it("Should render a single trigger button labeled 'Resume application' with the IconPlayerPlay icon", () => {
      render(
        <ResumeApplicationButton
          serviceId={SERVICE_ID}
          applicationType={applicationType}
          applications={apps}
        />,
      );

      const trigger = screen.getByTestId("dropdown-menu-trigger");
      expect(trigger).toHaveTextContent(/^Resume application$/);
      expect(trigger).toHaveAttribute("data-variant", "default");
      expect(trigger).toHaveAttribute("data-size", "default");
      expect(trigger).toContainElement(screen.getByTestId("icon-player-play"));
    });

    it("Should render the primary 'Resume application' item linking to the application page and a 'Start a new application' item linking to the apply route, with a separator between them", () => {
      render(
        <ResumeApplicationButton
          serviceId={SERVICE_ID}
          applicationType={applicationType}
          applications={apps}
        />,
      );

      const items = screen.getAllByTestId("dropdown-menu-item");
      expect(items).toHaveLength(2);

      expect(items[0]).toHaveTextContent(/^Resume application$/);
      expect(items[0]).toHaveAttribute(
        "href",
        `/app/services/${SERVICE_ID}/applications/${APP_ID_NEWEST}`,
      );

      expect(items[1]).toHaveTextContent("Start a new application");
      expect(items[1]).toHaveAttribute(
        "href",
        `/app/services/${SERVICE_ID}/apply/${TYPE_ID}`,
      );

      expect(
        screen.getByTestId("dropdown-menu-separator"),
      ).toBeInTheDocument();
    });
  });

  describe("when the user has two or more applications", () => {
    const apps = [
      buildApp(APP_ID_NEWEST, "Tax return", "2026-04-23T14:30:00Z"),
      buildApp(APP_ID_MID, "Tax return", "2026-04-22T12:00:00Z"),
      buildApp(APP_ID_OLD, "Tax return", "2026-04-20T09:15:00Z"),
    ];

    it("Should label the trigger button 'Resume latest application'", () => {
      render(
        <ResumeApplicationButton
          serviceId={SERVICE_ID}
          applicationType={applicationType}
          applications={apps}
        />,
      );

      const trigger = screen.getByTestId("dropdown-menu-trigger");
      expect(trigger).toHaveTextContent(/^Resume latest application$/);
    });

    it("Should render the latest as the primary item, then n-1 older 'Resume ... (date)' items, a separator, and finally 'Start a new application'", () => {
      render(
        <ResumeApplicationButton
          serviceId={SERVICE_ID}
          applicationType={applicationType}
          applications={apps}
        />,
      );

      const items = screen.getAllByTestId("dropdown-menu-item");
      expect(items).toHaveLength(4);

      expect(items[0]).toHaveTextContent(/^Resume latest application$/);
      expect(items[0]).toHaveAttribute(
        "href",
        `/app/services/${SERVICE_ID}/applications/${APP_ID_NEWEST}`,
      );

      expect(items[1]).toHaveTextContent(/^Resume Tax return \(.+\)$/);
      expect(items[1]).toHaveAttribute(
        "href",
        `/app/services/${SERVICE_ID}/applications/${APP_ID_MID}`,
      );

      expect(items[2]).toHaveTextContent(/^Resume Tax return \(.+\)$/);
      expect(items[2]).toHaveAttribute(
        "href",
        `/app/services/${SERVICE_ID}/applications/${APP_ID_OLD}`,
      );

      expect(
        screen.getByTestId("dropdown-menu-separator"),
      ).toBeInTheDocument();

      expect(items[3]).toHaveTextContent("Start a new application");
      expect(items[3]).toHaveAttribute(
        "href",
        `/app/services/${SERVICE_ID}/apply/${TYPE_ID}`,
      );
    });

    it("Should fall back to 'application' when serviceApplicationTitle is blank", () => {
      const blankApps = [
        buildApp(APP_ID_NEWEST, "Tax return", "2026-04-23T14:30:00Z"),
        buildApp(APP_ID_MID, "   ", "2026-04-22T12:00:00Z"),
      ];

      render(
        <ResumeApplicationButton
          serviceId={SERVICE_ID}
          applicationType={applicationType}
          applications={blankApps}
        />,
      );

      const items = screen.getAllByTestId("dropdown-menu-item");
      expect(items[1]).toHaveTextContent(/^Resume application \(.+\)$/);
    });
  });
});

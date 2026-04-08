import "@testing-library/jest-dom";
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { ConsentTimeline } from "../consent-timeline.component";

jest.mock("@repo/ui", () => ({
  Badge: ({
    children,
    variant,
    className,
  }: {
    children: ReactNode;
    variant?: string;
    className?: string;
  }) => (
    <span
      data-testid={`badge-${String(children)}`}
      data-variant={variant}
      className={className}
    >
      {children}
    </span>
  ),
  Card: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => (
    <div data-testid="timeline-card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock("@tabler/icons-react", () => ({
  IconChevronRight: ({ className }: { className?: string }) => (
    <svg data-testid="icon-chevron-right" className={className} />
  ),
}));

jest.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    className,
  }: {
    children: ReactNode;
    to: string;
    params?: { statementId?: string };
    className?: string;
  }) => (
    <a
      data-testid={`consent-link-${params?.statementId ?? "unknown"}`}
      href={to.replace("$statementId", params?.statementId ?? "")}
      className={className}
    >
      {children}
    </a>
  ),
}));

const monthLong = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const monthShort = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

describe("ConsentTimeline Component Test", () => {
  beforeAll(() => {
    jest
      .spyOn(Date.prototype, "toLocaleDateString")
      .mockImplementation(function mockToLocaleDateString(
        this: Date,
        _locales?: Intl.LocalesArgument,
        options?: Intl.DateTimeFormatOptions,
      ) {
        if (options?.year === "numeric" && options?.month === "long") {
          return `${monthLong[this.getMonth()]} ${this.getFullYear()}`;
        }

        if (options?.month === "short") {
          return monthShort[this.getMonth()];
        }

        return `${this.getMonth() + 1}/${this.getDate()}/${this.getFullYear()}`;
      });

    jest
      .spyOn(Date.prototype, "toLocaleTimeString")
      .mockImplementation(function mockToLocaleTimeString(
        this: Date,
        _locales?: Intl.LocalesArgument,
        options?: Intl.DateTimeFormatOptions,
      ) {
        if (options?.hour === "2-digit" && options?.minute === "2-digit") {
          const hours = this.getHours();
          const minutes = String(this.getMinutes()).padStart(2, "0");
          const suffix = hours >= 12 ? "PM" : "AM";
          const displayHour = String(hours % 12 || 12).padStart(2, "0");
          return `${displayHour}:${minutes} ${suffix}`;
        }

        return `${this.getHours()}:${this.getMinutes()}`;
      });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  const groups = [
    {
      date: "2024-01-15T09:00:00",
      items: [
        {
          id: "statement-1",
          documentName: "Privacy Policy",
          status: "granted",
          statementDate: "2024-01-15T13:45:00",
        },
      ],
    },
    {
      date: "2024-01-20T10:00:00",
      items: [
        {
          id: "statement-2",
          documentName: "Terms of Service",
          status: "revoked",
          statementDate: "2024-01-20T08:05:00",
        },
      ],
    },
    {
      date: "2024-02-03T11:00:00",
      items: [
        {
          id: "statement-3",
          documentName: "Cookie Policy",
          status: "granted",
          statementDate: "2024-02-03T18:30:00",
        },
      ],
    },
  ];

  it("renders the empty state when there is no consent history", () => {
    render(<ConsentTimeline groups={[]} />);

    expect(screen.getByText("No consent history found.")).toBeInTheDocument();
  });

  it("renders grouped timeline content, badges, times, icons, and statement links", () => {
    render(<ConsentTimeline groups={groups as never} />);

    expect(
      screen.getByRole("heading", { name: "January 2024" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "February 2024" }),
    ).toBeInTheDocument();

    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();

    expect(screen.getAllByText("Jan")).toHaveLength(2);
    expect(screen.getByText("Feb")).toBeInTheDocument();

    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
    expect(screen.getByText("Terms of Service")).toBeInTheDocument();
    expect(screen.getByText("Cookie Policy")).toBeInTheDocument();

    expect(screen.getByText("01:45 PM")).toBeInTheDocument();
    expect(screen.getByText("08:05 AM")).toBeInTheDocument();
    expect(screen.getByText("06:30 PM")).toBeInTheDocument();

    const grantedBadges = screen.getAllByTestId("badge-Granted");
    expect(grantedBadges).toHaveLength(2);
    grantedBadges.forEach((badge) => {
      expect(badge).toHaveAttribute("data-variant", "default");
      expect(badge).toHaveClass("bg-green-600", "text-white");
    });

    const revokedBadges = screen.getAllByTestId("badge-Revoked");
    expect(revokedBadges).toHaveLength(1);
    revokedBadges.forEach((badge) => {
      expect(badge).toHaveAttribute("data-variant", "destructive");
      expect(badge).toHaveClass("bg-red-600", "text-white");
    });

    expect(screen.getAllByTestId("icon-chevron-right")).toHaveLength(3);

    expect(screen.getByTestId("consent-link-statement-1")).toHaveAttribute(
      "href",
      "/app/settings/consent-history/statement-1",
    );
    expect(screen.getByTestId("consent-link-statement-2")).toHaveAttribute(
      "href",
      "/app/settings/consent-history/statement-2",
    );
    expect(screen.getByTestId("consent-link-statement-3")).toHaveAttribute(
      "href",
      "/app/settings/consent-history/statement-3",
    );
  });

  it("groups multiple date entries under a single month heading", () => {
    render(<ConsentTimeline groups={groups as never} />);

    const januaryHeading = screen.getAllByRole("heading", {
      level: 2,
      name: "January 2024",
    });

    expect(januaryHeading).toHaveLength(1);

    const januarySection = januaryHeading[0].parentElement;
    expect(januarySection).not.toBeNull();

    const januaryQueries = within(januarySection as HTMLElement);

    expect(januaryQueries.getByText("15")).toBeInTheDocument();
    expect(januaryQueries.getByText("20")).toBeInTheDocument();
    expect(januaryQueries.getAllByText("Jan")).toHaveLength(2);
    expect(januaryQueries.getByText("Privacy Policy")).toBeInTheDocument();
    expect(januaryQueries.getByText("Terms of Service")).toBeInTheDocument();
  });
});

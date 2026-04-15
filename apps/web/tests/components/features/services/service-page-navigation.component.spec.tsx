import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

jest.mock("@repo/ui", () => ({
  Button: ({
    children,
    variant,
    size,
    className,
    onClick,
  }: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
    children?: ReactNode;
  }) => (
    <button
      type="button"
      data-variant={variant}
      data-size={size}
      className={className}
      onClick={onClick}
    >
      {children}
    </button>
  ),
}));

jest.mock("@tabler/icons-react", () => ({
  IconChevronLeft: ({ className }: { className?: string }) => (
    <svg data-testid="icon-chevron-left" className={className} />
  ),
  IconChevronRight: ({ className }: { className?: string }) => (
    <svg data-testid="icon-chevron-right" className={className} />
  ),
}));

jest.mock("src/features/app/components/container.component", () => ({
  Container: ({
    children,
    ...props
  }: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) => (
    <div data-testid="container" {...props}>
      {children}
    </div>
  ),
}));

const mockScrollIntoView = jest.fn();
const mockScrollBy = jest.fn();

class MockResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

beforeAll(() => {
  window.ResizeObserver =
    MockResizeObserver as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView = mockScrollIntoView;
  Element.prototype.scrollBy = mockScrollBy;
});

import { ServicePageNavigation } from "src/features/services/components/service-page-navigation.component";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "eligibility-criteria", label: "Eligibility criteria" },
  { id: "application-process", label: "Application process" },
  { id: "your-activity", label: "Your activity" },
  { id: "more-information", label: "More information" },
];

describe("ServicePageNavigation Component Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    SECTIONS.forEach(({ id }) => {
      if (!document.getElementById(id)) {
        const el = document.createElement("div");
        el.id = id;
        document.body.appendChild(el);
      }
    });
  });

  afterEach(() => {
    cleanup();
    SECTIONS.forEach(({ id }) => {
      document.getElementById(id)?.remove();
    });
  });

  it("Should render all five section buttons", () => {
    render(
      <ServicePageNavigation serviceName="Income Assistance" visible={false} />,
    );

    expect(screen.getAllByText("Overview")).toHaveLength(2);
    expect(screen.getAllByText("Eligibility criteria")).toHaveLength(2);
    expect(screen.getAllByText("Application process")).toHaveLength(2);
    expect(screen.getAllByText("Your activity")).toHaveLength(2);
    expect(screen.getAllByText("More information")).toHaveLength(2);
  });

  it("Should render Overview as the initially active section", () => {
    const { container } = render(
      <ServicePageNavigation serviceName="Income Assistance" visible={false} />,
    );

    // Scope to the inline navigation bar only (not the fixed overlay)
    const inlineNav = container.querySelector(
      ".overflow-x-auto",
    ) as HTMLElement;
    expect(inlineNav).toBeInTheDocument();

    const allButtons = Array.from(inlineNav.querySelectorAll("button"));

    const moreInfoButton = allButtons.find(
      (btn) => btn.textContent?.trim() === "More information",
    );
    expect(moreInfoButton).toBeDefined();
    expect(moreInfoButton).toHaveAttribute("data-variant", "default");

    // All other sections should be inactive
    const inactiveLabels = [
      "Overview",
      "Eligibility criteria",
      "Application process",
      "Your activity",
    ];

    inactiveLabels.forEach((label) => {
      const btn = allButtons.find((b) => b.textContent?.trim() === label);
      expect(btn).toBeDefined();
      expect(btn).toHaveAttribute("data-variant", "ghost");
    });
  });

  it("Should render the service name in the fixed overlay", () => {
    render(
      <ServicePageNavigation serviceName="Income Assistance" visible={false} />,
    );

    expect(screen.getByText("Income Assistance")).toBeInTheDocument();
  });

  it("Should apply opacity-100 to the overlay when visible is true", () => {
    const { container } = render(
      <ServicePageNavigation serviceName="Income Assistance" visible={true} />,
    );

    const overlay = container.querySelector(".fixed.top-0");
    expect(overlay).toHaveClass("opacity-100");
    expect(overlay).not.toHaveClass("opacity-0");
    expect(overlay).not.toHaveClass("pointer-events-none");
  });

  it("Should apply opacity-0 and pointer-events-none to the overlay when visible is false", () => {
    const { container } = render(
      <ServicePageNavigation serviceName="Income Assistance" visible={false} />,
    );

    const overlay = container.querySelector(".fixed.top-0");
    expect(overlay).toHaveClass("opacity-0", "pointer-events-none");
    expect(overlay).not.toHaveClass("opacity-100");
  });

  it("Should activate the second section when the first section has scrolled past", () => {
    const { container } = render(
      <ServicePageNavigation serviceName="Income Assistance" visible={false} />,
    );

    const setRect = (id: string, top: number) => {
      const el = document.getElementById(id) as HTMLElement;
      jest.spyOn(el, "getBoundingClientRect").mockReturnValue({
        top,
        bottom: top + 100,
        height: 100,
        left: 0,
        right: 1000,
        width: 1000,
        x: 0,
        y: top,
        toJSON: () => ({}),
      });
    };

    // Make "Eligibility criteria" the latest section that should be active after scroll.
    setRect("overview", -40);
    setRect("eligibility-criteria", 40);
    setRect("application-process", 700);
    setRect("your-activity", 1000);
    setRect("more-information", 1300);

    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    const inlineNav = container.querySelector(
      ".overflow-x-auto",
    ) as HTMLElement;
    expect(inlineNav).toBeInTheDocument();

    const inlineButtons = Array.from(inlineNav.querySelectorAll("button"));

    const eligibilityButton = inlineButtons.find(
      (btn) => btn.textContent?.trim() === "Eligibility criteria",
    );
    expect(eligibilityButton).toBeDefined();
    expect(eligibilityButton).toHaveAttribute("data-variant", "default");

    const overviewButton = inlineButtons.find(
      (btn) => btn.textContent?.trim() === "Overview",
    );
    expect(overviewButton).toBeDefined();
    expect(overviewButton).toHaveAttribute("data-variant", "ghost");
  });

  it("Should call scrollIntoView when a section button is clicked", () => {
    render(
      <ServicePageNavigation serviceName="Income Assistance" visible={false} />,
    );

    const eligibilityButtons = screen.getAllByText("Eligibility criteria");
    fireEvent.click(eligibilityButtons[0]);

    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
  });

  it("Should show scroll-left button and call scrollBy when scrollLeft > 0", () => {
    const { container } = render(
      <ServicePageNavigation serviceName="Income Assistance" visible={false} />,
    );

    const scrollContainers = container.querySelectorAll(".overflow-x-auto");
    const inlineScrollContainer = scrollContainers[0] as HTMLElement;

    Object.defineProperty(inlineScrollContainer, "scrollLeft", {
      writable: true,
      value: 100,
    });
    Object.defineProperty(inlineScrollContainer, "scrollWidth", {
      writable: true,
      value: 500,
    });
    Object.defineProperty(inlineScrollContainer, "clientWidth", {
      writable: true,
      value: 300,
    });

    act(() => {
      fireEvent.scroll(inlineScrollContainer);
    });

    const scrollLeftButton = container.querySelector(
      "[aria-label='Scroll left']",
    );
    expect(scrollLeftButton).toBeInTheDocument();

    fireEvent.click(scrollLeftButton!);
    expect(mockScrollBy).toHaveBeenCalledWith({
      left: -200,
      behavior: "smooth",
    });
  });

  it("Should show scroll-right button and call scrollBy when content overflows to the right", () => {
    const { container } = render(
      <ServicePageNavigation serviceName="Income Assistance" visible={false} />,
    );

    const scrollContainers = container.querySelectorAll(".overflow-x-auto");
    const inlineScrollContainer = scrollContainers[0] as HTMLElement;

    Object.defineProperty(inlineScrollContainer, "scrollLeft", {
      writable: true,
      value: 0,
    });
    Object.defineProperty(inlineScrollContainer, "scrollWidth", {
      writable: true,
      value: 500,
    });
    Object.defineProperty(inlineScrollContainer, "clientWidth", {
      writable: true,
      value: 300,
    });

    act(() => {
      fireEvent.scroll(inlineScrollContainer);
    });

    const scrollRightButton = container.querySelector(
      "[aria-label='Scroll right']",
    );
    expect(scrollRightButton).toBeInTheDocument();

    fireEvent.click(scrollRightButton!);
    expect(mockScrollBy).toHaveBeenCalledWith({
      left: 200,
      behavior: "smooth",
    });
  });

  it("Should remove the scroll listener from window on unmount", () => {
    const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");

    const { unmount } = render(
      <ServicePageNavigation serviceName="Income Assistance" visible={false} />,
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
    );
  });
});

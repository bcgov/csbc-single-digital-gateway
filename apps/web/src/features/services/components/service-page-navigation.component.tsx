import { Button } from "@repo/ui";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Container } from "../../app/components/container.component";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "eligibility-criteria", label: "Eligibility criteria" },
  { id: "application-process", label: "Application process" },
  { id: "your-activity", label: "Your activity" },
  { id: "more-information", label: "More information" },
] as const;

function ScrollableRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollIndicators = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    updateScrollIndicators();

    el.addEventListener("scroll", updateScrollIndicators, { passive: true });

    const observer = new ResizeObserver(updateScrollIndicators);
    observer.observe(el);

    return () => {
      el.removeEventListener("scroll", updateScrollIndicators);
      observer.disconnect();
    };
  }, [updateScrollIndicators]);

  return (
    <div className={`relative ${className ?? ""}`}>
      {canScrollLeft && (
        <button
          type="button"
          className="absolute left-0 top-0 bottom-0 z-10 flex items-center bg-linear-to-r from-gray-200 to-transparent pr-2 bg-white"
          onClick={() =>
            scrollContainerRef.current?.scrollBy({
              left: -200,
              behavior: "smooth",
            })
          }
          aria-label="Scroll left"
        >
          <IconChevronLeft className="size-4" />
        </button>
      )}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto flex flex-row gap-1 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {children}
      </div>
      {canScrollRight && (
        <button
          type="button"
          className="absolute right-0 top-0 bottom-0 z-10 flex items-center bg-linear-to-l from-gray-200 to-transparent pl-2 bg-white"
          onClick={() =>
            scrollContainerRef.current?.scrollBy({
              left: 200,
              behavior: "smooth",
            })
          }
          aria-label="Scroll right"
        >
          <IconChevronRight className="size-4" />
        </button>
      )}
    </div>
  );
}

interface ServicePageNavigationProps {
  serviceName: string;
  visible: boolean;
}

export function ServicePageNavigation({
  serviceName,
  visible,
}: ServicePageNavigationProps) {
  const [activeSectionId, setActiveSectionId] = useState<string>(
    SECTIONS[0].id,
  );

  useEffect(() => {
    const handleScroll = () => {
      let activeId: string = SECTIONS[0].id;
      for (let i = 1; i < SECTIONS.length; i++) {
        const prevEl = document.getElementById(SECTIONS[i - 1].id);
        if (!prevEl) continue;
        const rect = prevEl.getBoundingClientRect();
        if (rect.top + rect.height / 2 <= 80) {
          activeId = SECTIONS[i].id;
        }
      }
      setActiveSectionId(activeId);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const sectionButtons = SECTIONS.map((section) => (
    <Button
      key={section.id}
      variant={section.id === activeSectionId ? "default" : "ghost"}
      size="sm"
      className="shrink-0"
      onClick={() =>
        document
          .getElementById(section.id)
          ?.scrollIntoView({ behavior: "smooth" })
      }
    >
      {section.label}
    </Button>
  ));

  return (
    <>
      {/* Inline navigation */}
      <ScrollableRow className="border-b-2 pt-2 pb-1 border-bcgov-gold">
        {sectionButtons}
      </ScrollableRow>

      {/* Fixed navigation overlay */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-background border-b py-2">
          <Container>
            <p className="text-sm font-semibold">{serviceName}</p>
            <ScrollableRow>
              {sectionButtons}
            </ScrollableRow>
          </Container>
        </div>
      </div>
    </>
  );
}

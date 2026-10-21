import { Button } from '@repo/ui/button';
import { Link } from '@tanstack/react-router';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useState } from 'react';
import { SERVICE_NAV, type ServiceNavItem } from '@/lib/service-nav';

// Base reserves the 4px left border as transparent so the active state doesn't shift the row; the
// active state forces the bcgov-blue color with `!` to win over the base color regardless of CSS
// source order (the app concats classes without tailwind-merge — see the class-concat-conflict note).
const LINK =
  'flex items-center gap-3 border-l-4 border-transparent px-2.5 py-2 text-[13.5px] font-medium no-underline text-foreground hover:bg-accent group-data-[collapsed=true]/rail:justify-center';
// `!font-bold`/`!text-bcgov-blue` because the base sets `font-medium`/`text-foreground` — without `!`
// the base can win by CSS source order (the app concats classes without tailwind-merge).
const LINK_ACTIVE = 'bg-accent !border-bcgov-blue !font-bold !text-bcgov-blue';
/** A plain section link (every item except the expandable "Service details"). */
function SectionLink({ item, slug, id }: { item: ServiceNavItem; slug: string; id: string }) {
  const ItemIcon = item.icon;
  return (
    <Link
      to={item.to}
      params={{ slug, id }}
      activeOptions={{ exact: item.exact }}
      aria-label={item.label}
      title={item.label}
      className={LINK}
      activeProps={{ className: LINK_ACTIVE }}
    >
      <ItemIcon className="size-[17px] shrink-0" aria-hidden />
      <span className="flex-1 truncate group-data-[collapsed=true]/rail:hidden">{item.label}</span>
    </Link>
  );
}

/**
 * The service console sidebar (feature 164): a heading row (service name + collapse trigger) over the
 * section nav. Mirrors the admin-rail `group/rail` + `data-collapsed` pattern — collapsing hides the
 * labels and shrinks the rail to icons. "Service details" expands into a submenu of the detail page's
 * section anchors (each `<Link hash>` scrolls to the matching `<section id>` on `…/details`). Collapse
 * state is local; the content column just re-flows.
 *
 * Feature 217: "Service details" no longer expands into a submenu of the detail page's section
 * anchors — those were derived from the service TYPE's uischema (feature 174), and both the type
 * and the schema-driven detail page are gone. It is a plain section link like the others until the
 * Form Studio is wired to the documents API.
 */
export function ServiceSidebar({
  slug,
  id,
  serviceName,
}: {
  slug: string;
  id: string;
  serviceName: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      data-collapsed={collapsed}
      // `overflow-y-auto`: the rail no longer scrolls with the page, so a nav list taller than the
      // viewport has to scroll within itself or its last items become unreachable.
      className="group/rail flex w-[248px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-border bg-background pb-3.5 transition-[width] data-[collapsed=true]:w-[64px]"
    >
      <div className="flex h-[58px] items-center gap-2 px-4 group-data-[collapsed=true]/rail:justify-center group-data-[collapsed=true]/rail:px-0">
        <span
          className="flex-1 truncate text-sm font-semibold group-data-[collapsed=true]/rail:hidden"
          title={serviceName}
        >
          {serviceName}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          type="button"
          className="shrink-0"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-pressed={collapsed}
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" aria-hidden />
          ) : (
            <PanelLeftClose className="size-4" aria-hidden />
          )}
        </Button>
      </div>
      <nav className="flex flex-col gap-0.5" aria-label="Service sections">
        {SERVICE_NAV.map((item) => (
          <SectionLink key={item.key} item={item} slug={slug} id={id} />
        ))}
      </nav>
    </aside>
  );
}

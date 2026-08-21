import { Button } from '@repo/ui/button';
import { Skeleton } from '@repo/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from '@tanstack/react-router';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useState } from 'react';
import { SERVICE_ALWAYS_SECTIONS, SERVICE_NAV, type ServiceNavItem } from '@/lib/service-nav';
import { serviceSectionAnchors } from '@/lib/service-sections';
import { serviceDefinitionQueryOptions } from '@/lib/services';

// Base reserves the 4px left border as transparent so the active state doesn't shift the row; the
// active state forces the bcgov-blue color with `!` to win over the base color regardless of CSS
// source order (the app concats classes without tailwind-merge — see the class-concat-conflict note).
const LINK =
  'flex items-center gap-3 border-l-4 border-transparent px-2.5 py-2 text-[13.5px] font-medium no-underline text-foreground hover:bg-accent group-data-[collapsed=true]/rail:justify-center';
// `!font-bold`/`!text-bcgov-blue` because the base sets `font-medium`/`text-foreground` — without `!`
// the base can win by CSS source order (the app concats classes without tailwind-merge).
const LINK_ACTIVE = 'bg-accent !border-bcgov-blue !font-bold !text-bcgov-blue';
// Submenu links have no left border of their own — the connecting vertical line is the `<ul>`'s
// border-l (see below). Active = background + bold bcgov-blue text.
const SUBLINK =
  'block py-1.5 pr-2.5 pl-4 text-[13px] no-underline text-muted-foreground hover:bg-accent hover:text-foreground';
const SUBLINK_ACTIVE = 'bg-accent !text-bcgov-blue';

/** The connector line + indent shared by the real submenu and its loading skeleton, so the rail
 * doesn't shift when the service definition resolves. */
const SUBMENU = 'mt-0.5 ml-[22px] flex flex-col gap-0.5 border-l border-border';
/** How many skeleton rows to show while the definition loads — the seeded Service type has five. */
const SKELETON_ROWS = 5;

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
 * The "Service details" section anchors (feature 174) — derived from the top-level `Group` elements
 * of the service definition's uischema via the SAME helper the details page renders from, so a link
 * here can never point at a section that isn't on the page.
 *
 * While the service query is in flight this renders skeleton rows rather than the previous static
 * list: a stale-then-corrected list would move links under the cursor. Once settled, an empty
 * derivation renders an empty list — not skeletons, which would imply more is coming.
 */
function DetailsSubmenu({ to, params }: { to: string; params: Record<string, string> }) {
  const hash = useLocation({ select: (location) => location.hash });
  // Navigation reflects the SERVICE TYPE's section structure, not the viewed version's template:
  // the rail must stay stable while you page through versions, and a service whose published
  // version predates a type reshape would otherwise show no submenu at all. The page BODY still
  // renders version-faithfully, so an older version can legitimately have no content under a
  // section the rail lists.
  const { data: definition, isPending } = useQuery(serviceDefinitionQueryOptions());

  if (isPending) {
    return (
      <ul className={SUBMENU} aria-hidden>
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <li key={index} className="py-1.5 pr-2.5 pl-4">
            <Skeleton className="h-3.5 w-28" />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={SUBMENU}>
      {serviceSectionAnchors(definition?.uischema, SERVICE_ALWAYS_SECTIONS).map((section) => (
        <li key={section.anchor}>
          <Link
            to={to}
            params={params}
            hash={section.anchor}
            className={`${SUBLINK} ${hash === section.anchor ? SUBLINK_ACTIVE : ''}`}
          >
            {section.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * The service console sidebar (feature 164): a heading row (service name + collapse trigger) over the
 * section nav. Mirrors the admin-rail `group/rail` + `data-collapsed` pattern — collapsing hides the
 * labels and shrinks the rail to icons. "Service details" expands into a submenu of the detail page's
 * section anchors (each `<Link hash>` scrolls to the matching `<section id>` on `…/details`). Collapse
 * state is local; the content column just re-flows.
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
  const pathname = useLocation({ select: (location) => location.pathname });

  const detailsPath = `/app/${slug}/services/${id}/details`;
  // `…/versions/:versionId/details` is the SAME console section as `…/details` — it just pins a
  // specific version. Matching only `…/details` made the submenu vanish (and the parent link go
  // inactive) as soon as you picked a non-published version from the header.
  const versionDetailMatch = new RegExp(
    `^/app/[^/]+/services/[^/]+/versions/([^/]+)/details/?$`,
  ).exec(pathname);
  const onDetails =
    pathname === detailsPath ||
    pathname.startsWith(`${detailsPath}/`) ||
    versionDetailMatch !== null;
  const viewedVersionId = versionDetailMatch?.[1];
  // The submenu is only shown while on the details route (never in the collapsed rail).
  const detailsExpanded = !collapsed && onDetails;
  const detailsItem = SERVICE_NAV.find((item) => item.key === 'details');

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
        {SERVICE_NAV.map((item) => {
          // "Service details" is a plain icon link in the collapsed rail; expanded, it toggles a
          // submenu of the detail page's section anchors.
          // While on the details route, "Service details" reveals its section-anchor submenu;
          // otherwise (and in the collapsed rail) it's a plain section link.
          if (item.key === 'details' && detailsExpanded && detailsItem) {
            const DetailsIcon = detailsItem.icon;
            return (
              <div key={item.key}>
                {/* `activeProps` alone would not fire on the version permalink (a different
                    route), so the active class is applied directly — we already know we're in the
                    details section. */}
                <Link
                  to={detailsItem.to}
                  params={{ slug, id }}
                  activeOptions={{ exact: false }}
                  className={`${LINK} ${LINK_ACTIVE}`}
                >
                  <DetailsIcon className="size-[17px] shrink-0" aria-hidden />
                  <span className="flex-1 truncate">{detailsItem.label}</span>
                </Link>
                {/* The vertical connector line runs down the left border, aligned under the parent
                    icon (border 4px + px-2.5 + ~half the 17px icon ≈ 22px). */}
                <DetailsSubmenu
                  to={
                    viewedVersionId === undefined
                      ? detailsItem.to
                      : '/app/$slug/services/$id/versions/$versionId/details'
                  }
                  params={
                    viewedVersionId === undefined
                      ? { slug, id }
                      : { slug, id, versionId: viewedVersionId }
                  }
                />
              </div>
            );
          }
          return <SectionLink key={item.key} item={item} slug={slug} id={id} />;
        })}
      </nav>
    </aside>
  );
}

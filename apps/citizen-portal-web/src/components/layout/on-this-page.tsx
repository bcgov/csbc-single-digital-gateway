import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from '@mdi/react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarProvider,
  SidebarTrigger,
} from '@repo/ui/sidebar';

export interface OnThisPageItem {
  id: string;
  label: string;
  /** An `@mdi/js` path constant, e.g. `mdiFileDocumentOutline`. */
  icon: string;
}

/** Highlights whichever `id` is currently scrolled into view, same technique as the /dev section's
 *  DevPageNav (IntersectionObserver over each target element, not a scroll-position calculation). */
function useActiveSection(ids: string[]): string {
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    if (ids.length === 0) {
      return undefined;
    }

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-20px 0px -85% 0px' },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [ids]);

  return activeId;
}

/**
 * Wraps page content with an optional "On this page" jump-nav, built on `@repo/ui`'s shadcn Sidebar.
 * With no `items` (or an empty list), renders `children` alone — no Sidebar machinery is mounted, so
 * a page without a nav still gets the full-width layout for free.
 *
 * Sidebar is a full-app-shell primitive (fixed positioning sized off the real viewport, and its
 * SidebarInset companion renders a `<main>`), so used here as a per-page rail it needs several
 * deliberate adjustments: `contain-paint` scopes the Sidebar's `fixed` child to this component
 * instead of the browser viewport (so it can't overlap the page's header/footer) AND clips it —
 * `contain-layout` alone establishes the containing block but doesn't clip, so an offcanvas-collapsed
 * sidebar stayed visibly peeking out past this wrapper instead of disappearing. That wrapper is left
 * to STRETCH (the flex row's default `align-items: stretch`, not `self-start`/`items-start`) to match
 * the content column's real height, deliberately — `<Sidebar>`'s own visible content is `position:
 * fixed` and contributes nothing to normal-flow height, so a `self-start`-sized wrapper computes to
 * zero height; that rendered fine on an uninterrupted first paint but silently stopped painting
 * anything inside it after any later async re-render (reproduced consistently once signed in, where
 * the header's notification queries resolve/fail after mount and trigger exactly that) — a
 * `position: sticky` + `contain: paint` + zero-height Chromium quirk. `min-h-0` overrides
 * SidebarProvider's hardcoded `min-h-svh`; and the content column is a plain `div`, not
 * `SidebarInset`, since PageShell already owns the page's one `<main id="main-content">`.
 */
export function OnThisPageLayout({
  items,
  children,
}: {
  items?: readonly OnThisPageItem[] | undefined;
  children: ReactNode;
}): ReactNode {
  const activeId = useActiveSection(items?.map((item) => item.id) ?? []);

  if (!items || items.length === 0) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider className="min-h-0">
      <div className="sticky top-6 contain-paint">
        {/* `collapsible="icon"` (not "offcanvas"): every item now has an icon, so collapsed still shows
            a meaningful icon-only rail — with a border that carries on unbroken from the header down to
            the last item — rather than sliding the whole panel (icons included) out of view. Only the
            text labels hide on collapse (`group-data-[collapsible=icon]:hidden`); the icons, the header's
            trigger, and the panel itself stay visible so it can always be reopened.
            `pt-6` here (not a margin on some ancestor wrapping both columns) is deliberate: it pads the
            *inside* of this bordered box, so the border stays flush with whatever sits above this layout
            while the header/nav content still gets breathing room from the top. */}
        <Sidebar collapsible="icon" className="pt-6">
          <SidebarHeader>
            <span className="font-bold uppercase pt-3 group-data-[collapsible=icon]:hidden">
              On this page
            </span>
            <SidebarTrigger />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <nav aria-label="On this page">
                  <SidebarMenu>
                    {items.map((item) => {
                      const isActive = item.id === activeId;
                      return (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            isActive={isActive}
                            render={
                              <a
                                href={`#${item.id}`}
                                aria-current={isActive ? 'location' : undefined}
                                aria-label={item.label}
                              />
                            }
                          >
                            <Icon path={item.icon} size="20px" aria-hidden />
                            <span className="group-data-[collapsible=icon]:hidden">
                              {item.label}
                            </span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </nav>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarRail />
        </Sidebar>
      </div>
      <div className="relative flex w-full min-w-0 flex-1 flex-col pt-6 md:pl-6">{children}</div>
    </SidebarProvider>
  );
}

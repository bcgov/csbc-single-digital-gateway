import { Button } from '@repo/ui/button';
import { Icon } from '@repo/ui/icon';
import { Separator } from '@repo/ui/separator';
import { Link, useLocation } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { CommandPalette } from '@/components/console/command-palette';
import { NotificationsMenu } from '@/components/console/notifications-menu';
import { ProfileMenu } from '@/components/console/profile-menu';
import { WorkspaceSwitcher } from '@/components/console/workspace-switcher';
import { ProductWordmark } from '@/components/product-wordmark';
import { type NavItem, TOP_NAV } from '@/lib/console-nav';

interface ConsoleHeaderProps {
  /** Active workspace slug, or undefined when there is no workspace (nav + actions are disabled). */
  slug: string | undefined;
  /**
   * Minimal variant (feature 161) — no workspace context (`/app` selection, `/app/account`). Renders
   * only the brand, notifications, and the avatar menu; hides the switcher, primary nav, and search.
   */
  minimal?: boolean;
}

// Full-height tab-style items: the active one shows a 2px bcgov-blue bottom border spanning the bar.
// NOTE: the border COLOR is set per-state (active/inactive) — never here — because these classes are
// concatenated without tailwind-merge, so a base `border-transparent` would win over the active color.
const LINK_BASE =
  'flex h-full items-center border-b-2 px-3 text-sm font-medium no-underline transition-colors';

/** Is `item` the active section for the current path? Settings owns both /settings and /team. */
function isActive(item: NavItem, slug: string, pathname: string): boolean {
  const base = `/app/${slug}`;
  if (item.key === 'overview') {
    return pathname === base || pathname === `${base}/`;
  }
  if (item.key === 'settings') {
    return pathname.startsWith(`${base}/settings`) || pathname.startsWith(`${base}/team`);
  }
  return pathname.startsWith(item.to.replace('$slug', slug));
}

function TopNavLink({
  item,
  slug,
  pathname,
}: {
  item: NavItem;
  slug: string | undefined;
  pathname: string;
}) {
  // No active workspace ⇒ scoped sections are shown but not navigable.
  if (slug === undefined) {
    return (
      <span
        aria-disabled="true"
        className={`${LINK_BASE} cursor-not-allowed border-transparent text-muted-foreground/40`}
      >
        {item.label}
      </span>
    );
  }
  const active = isActive(item, slug, pathname);
  return (
    <Link
      to={item.to}
      params={{ slug }}
      className={`${LINK_BASE} ${
        active
          ? 'border-bcgov-blue bg-accent text-foreground'
          : 'border-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
      }`}
    >
      {item.label}
    </Link>
  );
}

/** Full-width top navigation bar: brand, workspace switcher, primary nav, search, notifications,
 * and the account menu. Search/notifications disable with no active workspace (feature 160). */
export function ConsoleHeader({ slug, minimal = false }: ConsoleHeaderProps) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const enabled = slug !== undefined;

  const brand = (
    <Link to="/app" aria-label="Operations Portal" className="flex items-center gap-2 no-underline">
      <Icon className="size-7 shrink-0" aria-hidden />
      <ProductWordmark className="text-[15px] text-foreground" />
    </Link>
  );

  // Minimal variant: brand on the left, notifications + avatar on the right. No switcher/nav/search.
  if (minimal) {
    return (
      <header className="flex h-[58px] shrink-0 items-center gap-3 border-b border-border px-4">
        {brand}
        <div className="ml-auto flex items-center gap-1.5">
          <NotificationsMenu disabled={!enabled} />
          <ProfileMenu />
        </div>
      </header>
    );
  }

  return (
    <header className="flex h-[58px] shrink-0 items-center gap-3 border-b border-border px-4">
      {brand}

      <Separator orientation="vertical" className="my-3" />

      <WorkspaceSwitcher />

      <nav className="flex h-full items-stretch gap-0.5">
        {TOP_NAV.map((item) => (
          <TopNavLink key={item.key} item={item} slug={slug} pathname={pathname} />
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon-sm"
          type="button"
          aria-label="Search"
          disabled={!enabled}
          onClick={() => setPaletteOpen(true)}
        >
          <Search className="size-[18px]" aria-hidden />
        </Button>
        <NotificationsMenu disabled={!enabled} />
        <ProfileMenu />
      </div>

      {enabled && slug !== undefined ? (
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} slug={slug} />
      ) : null}
    </header>
  );
}

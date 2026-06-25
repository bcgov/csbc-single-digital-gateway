import { Separator } from '@repo/ui/separator';
import { Link } from '@tanstack/react-router';
import { ProfileMenu } from '@/components/console/profile-menu';
import { WorkspaceSwitcher } from '@/components/console/workspace-switcher';
import { type NavItem, PRIMARY_NAV, SECONDARY_NAV, SETTINGS_NAV } from '@/lib/console-nav';

const BASE =
  'flex items-center gap-3 rounded-md px-2.5 py-2 text-[13.5px] font-medium group-data-[collapsed=true]/rail:justify-center';

function NavLink({ item, slug }: { item: NavItem; slug: string | undefined }) {
  const Icon = item.icon;
  const inner = (
    <>
      <Icon className="size-[17px] shrink-0" aria-hidden />
      <span className="flex-1 truncate group-data-[collapsed=true]/rail:hidden">{item.label}</span>
    </>
  );

  // No active workspace ⇒ scoped sections are disabled (rendered, but not navigable links).
  if (item.scoped && slug === undefined) {
    return (
      <span
        aria-disabled="true"
        title={item.label}
        className={`${BASE} cursor-not-allowed text-sidebar-foreground/40`}
      >
        {inner}
      </span>
    );
  }

  return (
    <Link
      to={item.to}
      // Sidebar items are all scoped; the disabled branch above handled the no-slug case.
      params={{ slug: slug as string }}
      aria-label={item.label}
      title={item.label}
      activeOptions={{ exact: item.to === '/app/$slug' }}
      className={`${BASE} text-sidebar-foreground hover:bg-sidebar-accent`}
      activeProps={{ className: 'bg-sidebar-accent text-sidebar-accent-foreground' }}
    >
      {inner}
    </Link>
  );
}

/** The left rail: workspace switcher, primary/secondary nav, settings, and the profile card. */
export function ConsoleSidebar({
  collapsed,
  slug,
}: {
  collapsed: boolean;
  slug: string | undefined;
}) {
  return (
    <aside
      data-collapsed={collapsed}
      className="group/rail flex w-[248px] shrink-0 flex-col gap-1 border-r border-sidebar-border bg-sidebar px-3 pb-3.5 transition-[width] data-[collapsed=true]:w-[68px]"
    >
      <div className="flex h-[58px] items-center">
        <WorkspaceSwitcher />
      </div>
      <nav className="flex flex-col gap-0.5">
        {PRIMARY_NAV.map((item) => (
          <NavLink key={item.key} item={item} slug={slug} />
        ))}
        <Separator className="my-2 bg-sidebar-border" />
        {SECONDARY_NAV.map((item) => (
          <NavLink key={item.key} item={item} slug={slug} />
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-0.5">
        <NavLink item={SETTINGS_NAV} slug={slug} />
        <Separator className="my-1.5 bg-sidebar-border" />
        <ProfileMenu />
      </div>
    </aside>
  );
}

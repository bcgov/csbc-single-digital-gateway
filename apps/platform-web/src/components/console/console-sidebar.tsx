import { Separator } from '@repo/ui/separator';
import { Link } from '@tanstack/react-router';
import { ProfileMenu } from '@/components/console/profile-menu';
import { WorkspaceSwitcher } from '@/components/console/workspace-switcher';
import { type NavItem, PRIMARY_NAV, SECONDARY_NAV, SETTINGS_NAV } from '@/lib/console-nav';

function NavLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      aria-label={item.label}
      title={item.label}
      activeOptions={{ exact: item.to === '/app' }}
      className="flex items-center gap-3 rounded-md px-2.5 py-2 text-[13.5px] font-medium text-sidebar-foreground hover:bg-sidebar-accent group-data-[collapsed=true]/rail:justify-center"
      activeProps={{ className: 'bg-sidebar-accent text-sidebar-accent-foreground' }}
    >
      <Icon className="size-[17px] shrink-0" aria-hidden />
      <span className="flex-1 truncate group-data-[collapsed=true]/rail:hidden">{item.label}</span>
    </Link>
  );
}

/** The left rail: workspace switcher, primary/secondary nav, settings, and the profile card. */
export function ConsoleSidebar({ collapsed }: { collapsed: boolean }) {
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
          <NavLink key={item.to} item={item} />
        ))}
        <Separator className="my-2 bg-sidebar-border" />
        {SECONDARY_NAV.map((item) => (
          <NavLink key={item.to} item={item} />
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-0.5">
        <NavLink item={SETTINGS_NAV} />
        <Separator className="my-1.5 bg-sidebar-border" />
        <ProfileMenu />
      </div>
    </aside>
  );
}

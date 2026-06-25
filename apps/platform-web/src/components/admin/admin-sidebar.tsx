import { Icon } from '@repo/ui/icon';
import { Logo } from '@repo/ui/logo';
import { Separator } from '@repo/ui/separator';
import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { type AdminNavItem, ADMIN_NAV } from '@/lib/admin-nav';

const BASE =
  'flex items-center gap-3 rounded-md px-2.5 py-2 text-[13.5px] font-medium group-data-[collapsed=true]/rail:justify-center';

function AdminNavLink({ item }: { item: AdminNavItem }) {
  const ItemIcon = item.icon;
  return (
    <Link
      to={item.to}
      aria-label={item.label}
      title={item.label}
      activeOptions={{ exact: item.to === '/admin' }}
      className={`${BASE} text-sidebar-foreground hover:bg-sidebar-accent`}
      activeProps={{ className: 'bg-sidebar-accent text-sidebar-accent-foreground' }}
    >
      <ItemIcon className="size-[17px] shrink-0" aria-hidden />
      <span className="flex-1 truncate group-data-[collapsed=true]/rail:hidden">{item.label}</span>
    </Link>
  );
}

/** The admin rail: brand logo (where the console shows the workspace switcher), nav, "Back to app". */
export function AdminSidebar({ collapsed }: { collapsed: boolean }) {
  return (
    <aside
      data-collapsed={collapsed}
      className="group/rail flex w-[248px] shrink-0 flex-col gap-1 border-r border-sidebar-border bg-sidebar px-3 pb-3.5 transition-[width] data-[collapsed=true]:w-[68px]"
    >
      <div className="flex h-[58px] items-center px-1.5">
        <Logo className="h-7 w-auto group-data-[collapsed=true]/rail:hidden" aria-label="BC Gov" />
        <Icon
          className="hidden h-7 w-7 group-data-[collapsed=true]/rail:block"
          aria-label="BC Gov"
        />
      </div>
      <nav className="flex flex-col gap-0.5">
        {ADMIN_NAV.map((item) => (
          <AdminNavLink key={item.key} item={item} />
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-0.5">
        <Separator className="my-1.5 bg-sidebar-border" />
        <Link
          to="/app"
          aria-label="Back to app"
          title="Back to app"
          className={`${BASE} text-sidebar-foreground hover:bg-sidebar-accent`}
        >
          <ArrowLeft className="size-[17px] shrink-0" aria-hidden />
          <span className="flex-1 truncate group-data-[collapsed=true]/rail:hidden">
            Back to app
          </span>
        </Link>
      </div>
    </aside>
  );
}

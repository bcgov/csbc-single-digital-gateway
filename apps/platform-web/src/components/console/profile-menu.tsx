import { Avatar, AvatarFallback } from '@repo/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import { Skeleton } from '@repo/ui/skeleton';
import { Link } from '@tanstack/react-router';
import { ChevronsUpDown, LifeBuoy, LogOut, UserCog } from 'lucide-react';
import { initials, roleLabel, useAuth } from '@/lib/auth';
import { displayName, logout } from '@/lib/bff';

async function handleLogout(): Promise<void> {
  await logout();
  window.location.assign('/');
}

/** Sidebar profile card + menu, wired to the real signed-in user from `GET /auth/me`. */
export function ProfileMenu() {
  const { data: user } = useAuth();
  const name = user ? displayName(user) : '';
  const role = user ? roleLabel(user.roles) : '';
  const email = user?.claims.email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left hover:bg-sidebar-accent group-data-[collapsed=true]/rail:justify-center">
        <Avatar size="sm">
          <AvatarFallback>{user ? initials(name) : '··'}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 leading-tight group-data-[collapsed=true]/rail:hidden">
          {user ? (
            <>
              <div className="truncate text-[12.5px] font-semibold text-sidebar-foreground">
                {name}
              </div>
              <div className="text-[11px] text-muted-foreground">{role}</div>
            </>
          ) : (
            <>
              <Skeleton className="mb-1 h-3 w-20" />
              <Skeleton className="h-2.5 w-12" />
            </>
          )}
        </div>
        <ChevronsUpDown
          className="size-3.5 shrink-0 text-muted-foreground group-data-[collapsed=true]/rail:hidden"
          aria-hidden
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent side="right" align="end" className="w-60">
        {user ? (
          <div className="flex flex-col px-2 py-1.5">
            <span className="text-[13px] font-semibold">{name}</span>
            {email ? (
              <span className="truncate text-xs font-normal text-muted-foreground">{email}</span>
            ) : null}
          </div>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link to="/app/account" />}>
          <UserCog className="size-4" aria-hidden />
          Account settings
        </DropdownMenuItem>
        <DropdownMenuItem>
          <LifeBuoy className="size-4" aria-hidden />
          Help &amp; support
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => {
            void handleLogout();
          }}
        >
          <LogOut className="size-4" aria-hidden />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

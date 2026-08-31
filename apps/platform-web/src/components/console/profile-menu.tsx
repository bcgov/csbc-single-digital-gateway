import { Avatar, AvatarFallback } from '@repo/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import { Link } from '@tanstack/react-router';
import { LifeBuoy, LogOut, ShieldCheck, UserCog } from 'lucide-react';
import { initials, roleLabel, useAuth } from '@/lib/auth';
import { displayName, logout } from '@/lib/bff';

async function handleLogout(): Promise<void> {
  await logout();
  window.location.assign('/');
}

/** Top-bar avatar menu, wired to the real signed-in user from `GET /auth/me`. Admins get an Admin
 * link here (feature 160 moved it out of the sidebar). */
export function ProfileMenu() {
  const { data: user } = useAuth();
  const name = user ? displayName(user) : '';
  const role = user ? roleLabel(user.roles) : '';
  const email = user?.claims.email;
  const isAdmin = user?.roles.includes('admin') ?? false;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open account menu"
        className="flex items-center rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring hover:opacity-90"
      >
        <Avatar size="sm">
          <AvatarFallback>{user ? initials(name) : '··'}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        {user ? (
          <div className="flex flex-col px-2 py-1.5">
            <span className="text-[13px] font-semibold">{name}</span>
            {email ? (
              <span className="truncate text-xs font-normal text-muted-foreground">{email}</span>
            ) : null}
            <span className="text-[11px] text-muted-foreground">{role}</span>
          </div>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link to="/app/account" />}>
          <UserCog className="size-4" aria-hidden />
          Account settings
        </DropdownMenuItem>
        {isAdmin ? (
          <DropdownMenuItem render={<Link to="/admin" />}>
            <ShieldCheck className="size-4" aria-hidden />
            Admin
          </DropdownMenuItem>
        ) : null}
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

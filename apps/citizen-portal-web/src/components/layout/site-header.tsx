import { Avatar, AvatarFallback } from '@repo/ui/avatar';
import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import { Logo } from '@repo/ui/logo';
import { Skeleton } from '@repo/ui/skeleton';
import { Link } from '@tanstack/react-router';
import { LogOut, UserCog } from 'lucide-react';
import { initials } from '@/lib/auth';
import { loginUrl } from '@/lib/bff';

/** The signed-in user, as far as the header needs to render the avatar + menu. */
export interface HeaderUser {
  name: string;
  email?: string | undefined;
}

interface SiteHeaderProps {
  /** `anonymous` shows a Log in button; `authenticated` shows the avatar menu. */
  variant: 'anonymous' | 'authenticated';
  /** The signed-in user (authenticated variant). `undefined` while the auth query loads. */
  user?: HeaderUser | undefined;
  /** Logout handler for the avatar menu (authenticated variant). */
  onLogout?: (() => void) | undefined;
  /** Which primary nav item is the current page. */
  activeNav?: 'home' | 'services' | undefined;
}

const NAV_ITEMS = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'services', label: 'Services', href: '/services' },
] as const;

/** Primary nav (Home, Services) — client-side router links so navigation doesn't reload the app. */
function PrimaryNav({ active }: { active?: 'home' | 'services' | undefined }) {
  return (
    <nav aria-label="Primary" className="hidden items-center gap-6 sm:flex">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.id}
          to={item.href}
          aria-current={active === item.id ? 'page' : undefined}
          className={`text-xs font-medium ${
            active === item.id
              ? 'text-foreground underline underline-offset-8'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

/** Shared brand lockup on the left of the header. */
function BrandLockup() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <Logo className="h-7 w-auto" aria-label="Government of British Columbia" />
      <span className="font-heading text-sm font-semibold text-foreground">
        Single Digital Gateway
      </span>
      <Badge variant="secondary" className="uppercase">
        beta
      </Badge>
    </Link>
  );
}

/** Avatar + dropdown for the authenticated header (name, account settings, log out). */
function ProfileMenu({
  user,
  onLogout,
}: {
  user?: HeaderUser | undefined;
  onLogout?: (() => void) | undefined;
}) {
  const label = user?.name ?? '';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full focus-visible:ring-[3px] focus-visible:ring-ring/50"
        aria-label="Account menu"
      >
        <Avatar size="sm">
          <AvatarFallback>{user ? initials(label) : '··'}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {user ? (
          <div className="flex flex-col px-2 py-1.5">
            <span className="text-[13px] font-semibold">{label}</span>
            {user.email ? (
              <span className="truncate text-xs font-normal text-muted-foreground">
                {user.email}
              </span>
            ) : null}
          </div>
        ) : (
          <div className="px-2 py-1.5">
            <Skeleton className="h-4 w-24" />
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link to="/account" />}>
          <UserCog className="size-4" aria-hidden />
          Account settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => {
            onLogout?.();
          }}
        >
          <LogOut className="size-4" aria-hidden />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Top site header. Anonymous → brand + nav + Log in button; authenticated → brand + nav + avatar. */
export function SiteHeader({ variant, user, onLogout, activeNav }: SiteHeaderProps) {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-4 px-4">
        <BrandLockup />
        <div className="ml-auto flex items-center gap-6">
          <PrimaryNav active={activeNav} />
          {variant === 'anonymous' ? (
            <Button size="sm" render={<a href={loginUrl} />}>
              Log in
            </Button>
          ) : (
            <ProfileMenu user={user} onLogout={onLogout} />
          )}
        </div>
      </div>
    </header>
  );
}

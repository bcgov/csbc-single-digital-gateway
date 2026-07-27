import { Avatar, AvatarFallback } from '@repo/ui/avatar';
import { buttonVariants } from '@repo/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from '@repo/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import { Icon as BrandIcon } from '@repo/ui/icon';
import { Logo } from '@repo/ui/logo';
import { Skeleton } from '@repo/ui/skeleton';
import { Link } from '@tanstack/react-router';
import { LogOut, Menu, UserCog, X } from 'lucide-react';
import { useState } from 'react';
import { initials, useLoginUrl } from '@/lib/auth';
import { HeaderNotifications } from '@/components/notifications/header-notifications';
import { mdiLogin } from '@mdi/js';
import { Icon } from '@mdi/react';

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
    <nav aria-label="Primary" className="hidden items-center lg:flex">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.id}
          to={item.href}
          aria-current={active === item.id ? 'page' : undefined}
          className={`text-foreground no-underline hover:underline p-4 ${active === item.id ? '' : ''}`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

/** Shared brand lockup on the left of the header. Collapses to the icon-only mark on small screens. */
function BrandLockup() {
  return (
    <div className="flex items-center">
      <Link to="/" aria-label="Go to the Single Digital Gateway homepage" className="pr-2 lg:pr-4">
        {/* Full logo on lg+, icon-only mark below lg (with padding so it isn't flush to the edges). */}
        <Logo className="hidden h-13 w-auto lg:block" aria-label="Government of British Columbia" />
        <BrandIcon
          className="h-9 py-1 w-auto lg:hidden"
          aria-label="Government of British Columbia"
        />
      </Link>
      <p className="border-l pl-2 text-sm font-bold whitespace-nowrap lg:pl-4 lg:text-lg">
        Single Digital Gateway
      </p>
      <sup className="ml-1.5 text-xs font-bold text-danger-hover lg:text-sm">alpha</sup>
    </div>
  );
}

/**
 * Small-screen menu (below lg) — a hamburger that opens a full-screen page listing the nav links,
 * plus Log in (anonymous only; authenticated users use the avatar menu for account/log out).
 */
function MobileMenu({
  active,
  login,
}: {
  active?: 'home' | 'services' | undefined;
  /** BFF login URL — present for the anonymous variant only. */
  login?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        aria-label="Menu"
        className="inline-flex items-center justify-center rounded-md p-2 focus-visible:ring-[3px] focus-visible:ring-ring/50 lg:hidden"
      >
        <Menu className="size-6" aria-hidden />
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="top-0 left-0 flex h-svh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-background p-0 sm:max-w-none"
      >
        {/* Top bar mirrors SiteHeader (brand lockup + same container), with the hamburger swapped
            for an X close control in the same top-right position. Title kept for a11y, hidden. */}
        <DialogTitle className="sr-only">Menu</DialogTitle>
        <div className="border-b bg-background">
          <div className="mx-auto px-4 md:px-8 w-full max-w-280 flex items-center gap-4">
            <BrandLockup />
            <div className="ml-auto flex items-center gap-2 lg:gap-6">
              <DialogClose
                aria-label="Close menu"
                className="inline-flex items-center justify-center rounded-md p-2 focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <X className="size-6" aria-hidden />
              </DialogClose>
            </div>
          </div>
        </div>
        <nav aria-label="Menu" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.id}
              to={item.href}
              onClick={() => setOpen(false)}
              aria-current={active === item.id ? 'page' : undefined}
              className="rounded-md px-3 py-3 text-lg font-medium text-foreground no-underline hover:bg-secondary-hover"
            >
              {item.label}
            </Link>
          ))}
          {login ? (
            <a
              href={login}
              className={`${buttonVariants({ variant: 'default', size: 'default' })} mt-4`}
            >
              <Icon path={mdiLogin} aria-hidden={true} />
              Log in
            </a>
          ) : null}
        </nav>
      </DialogContent>
    </Dialog>
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
  const loginUrl = useLoginUrl();
  return (
    <header className="border-b bg-background">
      <div className="mx-auto px-4 md:px-8 w-full max-w-280 flex items-center gap-4">
        <BrandLockup />
        <div className="ml-auto flex items-center gap-2 lg:gap-6">
          <PrimaryNav active={activeNav} />
          {variant === 'anonymous' ? (
            <>
              {/* BFF login is a different origin — native anchor for a full-page navigation. The
                  wrapper owns the responsive visibility so its `hidden` wins (buttonVariants sets
                  `inline-flex`, which a sibling `hidden` on the same element wouldn't reliably beat). */}
              <span className="hidden lg:inline-flex">
                <a
                  href={loginUrl}
                  className={buttonVariants({ variant: 'default', size: 'default' })}
                >
                  <Icon path={mdiLogin} aria-hidden={true} />
                  Log in
                </a>
              </span>
              <MobileMenu active={activeNav} login={loginUrl} />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <HeaderNotifications />
              <ProfileMenu user={user} onLogout={onLogout} />
              <MobileMenu active={activeNav} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

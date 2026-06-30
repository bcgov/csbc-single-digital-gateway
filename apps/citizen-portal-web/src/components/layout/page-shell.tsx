import type { ReactNode } from 'react';
import { type HeaderUser, SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';

interface PageShellProps {
  variant: 'anonymous' | 'authenticated';
  user?: HeaderUser | undefined;
  onLogout?: (() => void) | undefined;
  activeNav?: 'home' | 'services' | undefined;
  children: ReactNode;
}

/** Full-page chrome: site header, a centered max-width main column, and the shared footer. */
export function PageShell({ variant, user, onLogout, activeNav, children }: PageShellProps) {
  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <SiteHeader variant={variant} user={user} onLogout={onLogout} activeNav={activeNav} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">{children}</main>
      <SiteFooter />
    </div>
  );
}

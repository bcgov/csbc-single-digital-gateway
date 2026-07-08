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
    <div className="flex min-h-svh flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded focus:shadow"
      >
        Skip to main content
      </a>
      <SiteHeader variant={variant} user={user} onLogout={onLogout} activeNav={activeNav} />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

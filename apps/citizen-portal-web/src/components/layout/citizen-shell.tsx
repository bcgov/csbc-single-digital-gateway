import type { ReactNode } from 'react';
import { PageShell } from '@/components/layout/page-shell';
import { useAuth } from '@/lib/auth';
import { displayName, logout } from '@/lib/bff';

async function handleLogout(): Promise<void> {
  await logout();
  window.location.assign('/');
}

/**
 * Page chrome for every citizen page: wires {@link PageShell} to the session — the authenticated
 * header when signed in, the anonymous one otherwise. The page body decides what auth-gated content
 * (if any) to show; a page that needs the session itself calls `useAuth()` too (it's one shared
 * query, so that costs no extra request).
 */
export function CitizenShell({
  activeNav,
  children,
}: {
  activeNav?: 'home' | 'services' | undefined;
  children: ReactNode;
}) {
  const { data: user } = useAuth();
  return (
    <PageShell
      variant={user ? 'authenticated' : 'anonymous'}
      activeNav={activeNav}
      user={user ? { name: displayName(user), email: user.claims.email } : undefined}
      onLogout={() => {
        void handleLogout();
      }}
    >
      {children}
    </PageShell>
  );
}

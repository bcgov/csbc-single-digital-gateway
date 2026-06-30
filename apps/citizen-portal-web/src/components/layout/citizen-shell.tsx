import type { ReactNode } from 'react';
import { PageShell } from '@/components/layout/page-shell';
import { useAuth } from '@/lib/auth';
import { displayName, logout } from '@/lib/bff';

async function handleLogout(): Promise<void> {
  await logout();
  window.location.assign('/');
}

/**
 * Page chrome for the always-accessible citizen pages (services list/detail/version): renders the
 * authenticated header when there's a session, the anonymous header otherwise. The page body
 * decides what auth-gated content (if any) to show.
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

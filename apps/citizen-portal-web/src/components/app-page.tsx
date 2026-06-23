import { Button } from '@repo/ui/button';
import { useEffect, useState } from 'react';
import { type AuthUser, displayName, getMe, loginUrl, logout } from '@/lib/bff';

type AuthState =
  | { status: 'loading' }
  | { status: 'authed'; user: AuthUser }
  | { status: 'anon' }
  | { status: 'error' };

async function handleLogout(): Promise<void> {
  await logout();
  window.location.assign('/');
}

/**
 * The authenticated landing page (feature 27). On mount it asks the BFF who the user is via
 * `GET /auth/me`; on success it greets them and offers logout, on 401 it prompts for login.
 */
export function AppPage() {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    getMe()
      .then((user) => {
        if (active) {
          setState(user === null ? { status: 'anon' } : { status: 'authed', user });
        }
      })
      .catch(() => {
        if (active) {
          setState({ status: 'error' });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4">
      {state.status === 'loading' && <p className="font-sans text-muted-foreground">Loading…</p>}

      {state.status === 'authed' && (
        <>
          <h1 className="font-sans text-2xl font-semibold">Hello, {displayName(state.user)}.</h1>
          <Button
            variant="outline"
            onClick={() => {
              void handleLogout();
            }}
          >
            Log out
          </Button>
        </>
      )}

      {state.status === 'anon' && (
        <>
          <p className="font-sans">You are not signed in.</p>
          <Button render={<a href={loginUrl} />}>Log in</Button>
        </>
      )}

      {state.status === 'error' && (
        <p role="alert" className="font-sans text-destructive">
          Something went wrong. Please try again.
        </p>
      )}
    </main>
  );
}

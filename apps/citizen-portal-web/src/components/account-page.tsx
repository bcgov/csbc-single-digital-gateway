import { Button } from '@repo/ui/button';
import { Card, CardContent } from '@repo/ui/card';
import { Skeleton } from '@repo/ui/skeleton';
import { CitizenShell } from '@/components/layout/citizen-shell';
import { useAuth, useLoginUrl } from '@/lib/auth';
import { displayName, logout } from '@/lib/bff';

async function handleLogout(): Promise<void> {
  await logout();
  window.location.assign('/');
}

/** One labelled read-only field in the account summary. */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

/**
 * The citizen account page (`/account`) — a minimal, login-gated summary of the signed-in user
 * (name + email) with a log-out action. A placeholder for richer account management later.
 */
export function AccountPage() {
  const { data: user, isPending } = useAuth();
  const loginUrl = useLoginUrl();

  return (
    <CitizenShell>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        {isPending ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : !user ? (
          <div className="flex flex-col items-center gap-3 rounded-xl bg-background p-10 text-center ring-1 ring-foreground/10">
            <p className="text-sm text-muted-foreground">
              You need to be signed in to view your account.
            </p>
            <Button render={<a href={loginUrl} />}>Log in</Button>
          </div>
        ) : (
          <>
            <header className="flex flex-col gap-1 border-b pb-6">
              <h1 className="font-heading text-2xl font-semibold text-foreground">
                Account settings
              </h1>
              <p className="text-sm text-muted-foreground">Your Single Digital Gateway account.</p>
            </header>
            <Card>
              <CardContent className="flex flex-col gap-4 py-5">
                <Field label="Name" value={displayName(user)} />
                {user.claims.email ? <Field label="Email" value={user.claims.email} /> : null}
              </CardContent>
            </Card>
            <div>
              <Button
                variant="outline"
                onClick={() => {
                  void handleLogout();
                }}
              >
                Log out
              </Button>
            </div>
          </>
        )}
      </div>
    </CitizenShell>
  );
}

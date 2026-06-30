import { Button } from '@repo/ui/button';
import { LogIn } from 'lucide-react';
import { loginUrl } from '@/lib/bff';

/** The "Log in to get started" call-to-action panel on the anonymous landing page. */
export function LoginCta() {
  return (
    <section className="flex flex-col items-center gap-3 rounded-xl bg-background p-8 text-center ring-1 ring-foreground/10">
      <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <LogIn className="size-5" aria-hidden />
      </span>
      <h2 className="font-heading text-lg font-semibold text-foreground">Log in to get started</h2>
      <p className="text-sm text-muted-foreground">
        Log in to apply for services and manage your requests.
      </p>
      <Button render={<a href={loginUrl} />}>Log in with BC Services Card Account</Button>
    </section>
  );
}

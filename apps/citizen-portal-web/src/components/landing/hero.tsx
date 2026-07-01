import { Button } from '@repo/ui/button';
import { useLoginUrl } from '@/lib/auth';

/** Anonymous landing hero: headline, supporting copy, BC Services Card login, and an illustration. */
export function Hero() {
  const loginUrl = useLoginUrl();
  return (
    <section className="grid items-center gap-8 rounded-xl bg-background p-8 ring-1 ring-foreground/10 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <h1 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">
          Access government services online
        </h1>
        <p className="text-sm text-muted-foreground">
          Find and use Government of British Columbia services.
        </p>
        <div>
          <Button render={<a href={loginUrl} />}>Log in with BC Services Card Account</Button>
        </div>
      </div>

      {/* Illustration placeholder — skeleton only, colours approximate. */}
      <div
        className="hidden aspect-[4/3] items-center justify-center rounded-lg bg-muted md:flex"
        aria-hidden
      >
        <div className="flex items-end gap-1">
          <span className="h-24 w-16 rounded-full bg-primary/80" />
          <span className="h-10 w-10 -translate-y-4 rounded-full bg-amber-500/80" />
        </div>
      </div>
    </section>
  );
}

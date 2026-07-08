import { Link } from '@tanstack/react-router';
import { buttonVariants } from '@repo/ui/button';
import { mdiLogin } from '@mdi/js';
import { Icon } from '@mdi/react';
import { useLoginUrl } from '@/lib/auth';

/** Anonymous landing hero: headline, supporting copy, BC Services Card login, and an illustration. */
export function Hero() {
  const loginUrl = useLoginUrl();
  return (
    <div className="border-b-2 border-bcgov-gold bg-linear-to-t from-blue-10 to-white">
      <div className="mx-4 md:mx-8 xl:mx-auto w-full max-w-280 flex flex-col">
        <section className="grid items-center gap-8 py-6 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <h1>Access government services online</h1>
            <p className="text-lg mb-4">Find and use Government of British Columbia services.</p>
            <div className="">
              <Link to={loginUrl} className={buttonVariants({ variant: 'default', size: 'lg' })}>
                <Icon path={mdiLogin} aria-hidden={true} />
                Log in with BC Services Card Account
              </Link>
            </div>
          </div>

          {/* Illustration placeholder — skeleton only, colours approximate. */}
          <div
            className="hidden aspect-4/3 items-center justify-center rounded-lg md:flex bg-white bg-opacity-25"
            aria-hidden
          >
            <div className="flex items-end gap-1">
              <span className="h-24 w-16 rounded-full bg-primary/80" />
              <span className="h-10 w-10 -translate-y-4 rounded-full bg-amber-500/80" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

import { Button } from '@repo/ui/button';
import { LogIn } from 'lucide-react';
import { useLoginUrl } from '@/lib/auth';

/** The "Log in to get started" call-to-action panel on the anonymous landing page. */
export function LoginCta() {
  const loginUrl = useLoginUrl();
  return (
    <section className="flex flex-col items-center gap-3 border-b-2 border-[#FCBA19] p-8 text-center ring-1 ring-foreground/10 bg-linear-to-b from-(--surface-color-background-white,#FFF) to-(--theme-blue-10,#F1F8FE)">
      <span className="flex size-10 items-center justify-center rounded-(--layout-margin-xs,2px) bg-[#F1F8FE] text-primary">
        <LogIn className="size-5 text-[#1a5a96]" aria-hidden />
      </span>
      <h2 className="font-heading text-lg font-semibold text-foreground">Log in to get started</h2>
      <p className="text-sm text-muted-foreground">
        Log in to apply for services and manage your requests.
      </p>
      <Button
        render={<a href={loginUrl} />}
        className="text-md mt-8 bg-[#003366] hover:bg-[#002244] p-6 font-normal rounded-(--layout-margin-xs,4px)"
      >
        <svg
          className="size-6 mr-2"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M11 7L9.6 8.4L12.2 11H2V13H12.2L9.6 15.6L11 17L16 12L11 7ZM20 19H12V21H20C21.1 21 22 20.1 22 19V5C22 3.9 21.1 3 20 3H12V5H20V19Z"
            fill="white"
          />
        </svg>
        Log in with BC Services Card Account
      </Button>
    </section>
  );
}

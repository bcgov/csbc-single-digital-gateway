import { Button } from '@repo/ui/button';
import { useLoginUrl } from '@/lib/auth';

/** Anonymous landing hero: headline, supporting copy, BC Services Card login, and an illustration. */
export function Hero() {
  const loginUrl = useLoginUrl();
  return (
    <section className="public-hero flex flex-col gap-5 w-[99vw] relative left-1/2 -translate-x-1/2 border-b-3 border-[#FCBA19] py-12 md:py-16 bg-linear-to-b from-(--surface-color-background-white,#FFF) to-(--theme-blue-10,#F1F8FE)">
      <div className="w-full max-w-5xl px-4 md:px-4 mx-auto grid grid-cols-1 md:grid-cols-2 items-center">
        <div>
          <h1 className="text-2xl md:text-4.5xl font-bold text-gray-900 leading-tight">
            Access government services online
          </h1>
          <p className="text-lg text-gray-600 mt-4 leading-relaxed">
            Find and use Government of British Columbia services.
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
        </div>
        {/* Illustration placeholder — skeleton only, colours approximate. */}
        <div
          className="hidden aspect-4/3 items-center justify-center rounded-lg bg-muted md:flex"
          aria-hidden
        >
          <div className="flex items-end gap-1">
            <span className="h-24 w-16 rounded-full bg-primary/80" />
            <span className="h-10 w-10 -translate-y-4 rounded-full bg-amber-500/80" />
          </div>
        </div>
      </div>
    </section>
  );
}

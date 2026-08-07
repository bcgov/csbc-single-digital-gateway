import { Button } from '@repo/ui/button';
import { Logo } from '@repo/ui/logo';
import { ProductWordmark } from '@/components/product-wordmark';
import { loginUrl } from '@/lib/bff';

/**
 * Anonymous landing / login gateway served at `/` (feature 70). A centred card whose
 * sole action starts the BFF OIDC flow. Login is a top-level anchor to the BFF
 * (cross-origin redirect), never a `fetch`. Uses theme tokens throughout.
 */
export function HomePage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-4 py-12">
      <div className="flex flex-col items-center gap-4">
        <Logo className="h-12 w-auto" aria-label="Single Digital Gateway" />
        <h1 className="text-center font-heading text-foreground">
          <ProductWordmark className="text-2xl" />
        </h1>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-4 rounded-lg bg-muted/30 p-6 ring-1 ring-foreground/10">
        <p className="text-center text-sm font-semibold text-foreground">To continue, log in:</p>

        <Button render={<a href={loginUrl} />} className="h-11 w-full text-sm">
          Log in with IDIR
        </Button>

        <p className="text-xs/relaxed text-muted-foreground">
          By continuing, you agree to the{' '}
          <a
            href="https://www2.gov.bc.ca/gov/content/home/disclaimer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Terms of use
          </a>{' '}
          and{' '}
          <a
            href="https://www2.gov.bc.ca/gov/content/home/privacy"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Privacy policy
          </a>
          .
        </p>
      </div>
    </main>
  );
}

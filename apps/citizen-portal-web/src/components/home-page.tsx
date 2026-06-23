import { Button } from '@repo/ui/button';
import { loginUrl } from '@/lib/bff';

export function HomePage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4">
      <h1 className="font-sans text-2xl font-semibold">Hello, citizen-portal-web.</h1>
      <Button render={<a href={loginUrl} />}>Log in</Button>
    </main>
  );
}

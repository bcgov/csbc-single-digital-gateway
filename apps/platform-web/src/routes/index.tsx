import { createFileRoute, redirect } from '@tanstack/react-router';
import { HomePage } from '@/components/home-page';
import { authQueryOptions } from '@/lib/auth';

export const Route = createFileRoute('/')({
  // Signed-in visitors skip the landing page and go straight to the console (feature 71). Anonymous
  // visitors (GET /auth/me → 401 → null) fall through to the landing/login gateway below.
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(authQueryOptions());
    if (user) {
      throw redirect({ to: '/app' });
    }
  },
  component: HomePage,
});

import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { useState } from 'react';
import { ConsoleHeader } from '@/components/console/console-header';
import { ConsoleSidebar } from '@/components/console/console-sidebar';
import { authQueryOptions } from '@/lib/auth';
import { loginUrl } from '@/lib/bff';

export const Route = createFileRoute('/app')({
  // Fail-closed guard: resolve the session once, redirect anonymous visitors to the BFF login.
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(authQueryOptions());
    if (!user) {
      throw redirect({ href: loginUrl });
    }
    return { user };
  },
  component: ConsoleLayout,
});

function ConsoleLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-svh w-full overflow-hidden bg-background text-foreground">
      <ConsoleSidebar collapsed={collapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <ConsoleHeader onToggleSidebar={() => setCollapsed((value) => !value)} />
        <main className="flex-1 overflow-auto bg-muted p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

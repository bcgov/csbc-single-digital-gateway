import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { useState } from 'react';
import { AdminHeader } from '@/components/admin/admin-header';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { authQueryOptions } from '@/lib/auth';
import { loginUrl } from '@/lib/bff';

export const Route = createFileRoute('/admin')({
  // Fail-closed: anonymous → BFF login; authenticated non-admins → back to the staff app.
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(authQueryOptions());
    if (!user) {
      throw redirect({ href: loginUrl });
    }
    if (!user.roles.includes('admin')) {
      throw redirect({ to: '/app' });
    }
    return { user };
  },
  component: AdminLayout,
});

function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-svh w-full overflow-hidden bg-background text-foreground">
      <AdminSidebar collapsed={collapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader onToggleSidebar={() => setCollapsed((value) => !value)} />
        <main className="flex-1 overflow-auto bg-muted p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

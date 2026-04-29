import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useIdirAuth } from "../../../../features/auth/auth.context";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettingsLayout,
});

function AdminSettingsLayout() {
  const { user } = useIdirAuth();
  const navigate = useNavigate();

  const roles = user?.roles ?? [];
  const hasAccess =
    roles.includes("admin") || roles.includes("org-admin");

  useEffect(() => {
    if (!hasAccess) {
      void navigate({ to: "/admin" });
    }
  }, [hasAccess, navigate]);

  if (!hasAccess) {
    return null;
  }

  return <Outlet />;
}

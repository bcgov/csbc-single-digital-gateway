import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useIdirAuth } from "../../../features/auth/auth.context";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const { user } = useIdirAuth();
  const navigate = useNavigate();

  const hasAdminRole = user?.roles?.includes("admin") ?? false;

  useEffect(() => {
    if (!hasAdminRole) {
      void navigate({ to: "/admin" });
    }
  }, [hasAdminRole, navigate]);

  if (!hasAdminRole) {
    return null;
  }

  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold">Settings</h1>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useIdirAuth } from "../../../features/auth/auth.context";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { user } = useIdirAuth();

  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold">
        Hello, {user?.name ?? user?.given_name ?? "Admin"}
      </h1>
    </div>
  );
}

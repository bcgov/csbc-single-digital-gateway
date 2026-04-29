import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/consent/documents/$docId")({
  component: () => <Outlet />,
});

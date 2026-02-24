import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/settings")({
  component: () => <Outlet />,
});

import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/settings/consent-history")({
  component: () => <Outlet />,
});

import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/admin/settings/consent/document-types",
)({
  component: () => <Outlet />,
});

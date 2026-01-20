import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PublicLayout } from "../../../features/app/components/public-layout/public-layout.component";

export const Route = createFileRoute("/(public)")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <PublicLayout>
      <Outlet />
    </PublicLayout>
  );
}

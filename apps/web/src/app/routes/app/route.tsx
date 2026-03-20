import {
  createFileRoute,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { AuthenticatedLayout } from "../../../features/app/components/authenticated-layout/authenticated-layout.component";

export const Route = createFileRoute("/app")({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        replace: true,
        to: "/",
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <AuthenticatedLayout>
      <Outlet />
    </AuthenticatedLayout>
  );
}

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { z } from "zod";
import icon from "../../../assets/brand/icon.svg";
import { AdminLayout } from "../../../features/admin/components/admin-layout.component";
import { useIdirAuth } from "../../../features/auth/auth.context";

const adminSearchSchema = z.object({
  returnTo: z.string().optional(),
});

export const Route = createFileRoute("/admin")({
  validateSearch: adminSearchSchema,
  component: AdminRouteComponent,
});

function AdminRouteComponent() {
  const idirAuth = useIdirAuth();
  const { returnTo } = Route.useSearch();

  if (!idirAuth.isAuthenticated) {
    return (
      <div className="relative flex flex-col items-center justify-center h-dvh">
        <img src={icon} alt="Logo" className="absolute top-4 left-4 h-8 w-8" />
        <Card className="w-full max-w-sm text-center shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Admin Sign In</CardTitle>
            <CardDescription>
              Sign in with your IDIR account to access the admin area.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <button
              type="button"
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              onClick={() => idirAuth.login(returnTo ?? "/admin")}
            >
              Get Started
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}

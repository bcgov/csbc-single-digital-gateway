import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
} from "@repo/ui";
import { IconBuildingCommunity, IconFileDescription } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/settings/")({
  staticData: {
    breadcrumbs: () => [{ label: "Settings" }],
  },
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>Settings</h1>
        <p className="text-muted-foreground">
          Manage administrative settings and organizational units.
        </p>
      </div>

      <Separator className="bg-bcgov-gold" />

      <div>
        <h2 className="text-xl font-semibold">Organization</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/admin/settings/org-units">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconBuildingCommunity className="size-5" />
                Org Units
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Manage organizational units and their members.
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div>
        <h2 className="text-xl font-semibold">Consent</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/admin/settings/consent/document-types">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconFileDescription className="size-5" />
                Document Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Manage consent document type definitions and schemas.
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

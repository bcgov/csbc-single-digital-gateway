import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Studio } from "../../../features/admin/jsonforms-studio/components/studio.component";

const studioSearchSchema = z.object({
  handoff: z.string().optional(),
});

export const Route = createFileRoute("/admin/studio")({
  validateSearch: studioSearchSchema,
  component: StudioRouteComponent,
});

function StudioRouteComponent() {
  const { handoff } = Route.useSearch();
  return <Studio handoffId={handoff ?? null} />;
}

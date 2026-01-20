import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(public)/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <></>;
}

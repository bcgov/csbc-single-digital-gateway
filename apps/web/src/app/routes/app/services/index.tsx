import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { servicesQueryOptions } from "../../../../features/services/data/services.query";
import { queryClient } from "../../../../lib/react-query.client";

export const Route = createFileRoute("/app/services/")({
  loader: () => queryClient.ensureQueryData(servicesQueryOptions),
  component: RouteComponent,
});

function RouteComponent() {
  const { data: services = [] } = useQuery(servicesQueryOptions);

  return (
    <div className="flex flex-col gap-4">
      <h1>Services</h1>
      {services.map((service) => (
        <Link
          to="/app/services/$serviceId"
          params={{ serviceId: service.id }}
          key={service.id}
        >
          <Card>
            <CardHeader>
              <CardTitle>{service.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{service.description}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

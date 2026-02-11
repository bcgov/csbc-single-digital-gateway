import {
  Badge,
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { servicesQueryOptions } from "../../../../features/services/data/services.query";
import { queryClient } from "../../../../lib/react-query.client";

export const Route = createFileRoute("/app/services/")({
  loader: () => queryClient.ensureQueryData(servicesQueryOptions),
  component: RouteComponent,
});

function RouteComponent() {
  const { data: services } = useSuspenseQuery(servicesQueryOptions);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Services</h1>
      {services.map((service) => (
        <Link
          to="/app/services/$serviceSlug"
          params={{ serviceSlug: service.slug }}
          key={service.slug}
        >
          <Card>
            <CardHeader>
              <CardTitle>{service.name}</CardTitle>
              <CardAction>
                {service.categories?.map((category) => (
                  <Badge variant="outline" key={category}>
                    {category.slice(0, 1).toUpperCase()}
                    {category.slice(1)}
                  </Badge>
                ))}
              </CardAction>
            </CardHeader>
            <CardContent>
              <p>{service.description?.short}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

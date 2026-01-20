import {
  Badge,
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import { services } from "../../../../features/services/data/services.data";

export const Route = createFileRoute("/app/services/")({
  component: RouteComponent,
});

function RouteComponent() {
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
                {service.tags.map((tag) => (
                  <Badge variant="outline">
                    {tag.slice(0, 1).toUpperCase()}
                    {tag.slice(1)}
                  </Badge>
                ))}
              </CardAction>
            </CardHeader>
            <CardContent>
              <p>{service.description}</p>
            </CardContent>
          </Card>
        </Link>

        // <div key={service.id} className="p-4 border rounded-lg">
        //   <h2 className="text-xl font-bold">{service.name}</h2>
        //   <p>{service.description}</p>
        //   <div className="flex gap-2">
        //     {service.tags.map((tag) => (
        //       <Badge variant="outline">
        //         {tag.slice(0, 1).toUpperCase()}
        //         {tag.slice(1)}
        //       </Badge>
        //     ))}
        //   </div>
        // </div>
      ))}
    </div>
  );
}

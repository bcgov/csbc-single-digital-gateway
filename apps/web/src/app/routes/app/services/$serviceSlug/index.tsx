import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui";
import { IconHeartHandshake } from "@tabler/icons-react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { services } from "../../../../../features/services/data/services.data";

export const Route = createFileRoute("/app/services/$serviceSlug/")({
  loader: ({ params }) => {
    const service = services.find((s) => s.slug === params.serviceSlug);
    if (!service) {
      throw notFound();
    }
    return { service };
  },
  staticData: {
    breadcrumbs: (loaderData: { service: { name: string } }) => [
      { label: "Services", to: "/app/services" },
      { label: loaderData.service.name },
    ],
  },
  component: RouteComponent,
  notFoundComponent: NotFoundComponent,
});

function RouteComponent() {
  const { service } = Route.useLoaderData();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-row gap-4">
        <div className="flex items-center justify-center">
          <IconHeartHandshake className="size-6" />
        </div>

        <div className="flex flex-col w-full">
          <div className="flex items-center gap-4 justify-between">
            <h1 className="text-2xl font-bold">{service.name}</h1>
            <div>
              {service.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag.slice(0, 1).toUpperCase()}
                  {tag.slice(1)}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actions card - visible on mobile only */}
      <Card size="sm" className="lg:hidden">
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {service.applications?.map((application) => (
            <Button
              key={application.id}
              className="w-full bg-bcgov-blue hover:bg-bcgov-blue/80 h-auto whitespace-normal py-2"
              render={
                <Link
                  to="/app/services/$serviceSlug/apply/$applicationId"
                  params={{
                    serviceSlug: service.slug,
                    applicationId: application.id,
                  }}
                />
              }
            >
              Apply for {application.name}
            </Button>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <Tabs defaultValue="info" className="w-full lg:w-4/5 flex flex-col gap-4">
          <TabsList className="w-full">
            <TabsTrigger value="info" className="flex-1">
              Info
            </TabsTrigger>
            <TabsTrigger value="eligibility" className="flex-1">
              Eligibility
            </TabsTrigger>
            <TabsTrigger value="apply" className="flex-1">
              Apply
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex-1">
              Activity
            </TabsTrigger>
          </TabsList>

          <Card size="sm">
            <TabsContent value="info" className="mt-0">
              <CardContent className="flex flex-col gap-4">
                <section>
                  <h2 className="text-lg font-semibold mb-2">
                    About this service
                  </h2>
                  <p className="text-muted-foreground">
                    {service.description || "No description available."}
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-2">How to apply</h2>
                  <p className="text-muted-foreground">
                    Application details coming soon.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-2">Eligibility</h2>
                  {service.eligibility && service.eligibility.length > 0 ? (
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      {service.eligibility.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">
                      Eligibility information coming soon.
                    </p>
                  )}
                </section>
              </CardContent>
            </TabsContent>

            <TabsContent value="eligibility" className="mt-0">
              <CardContent className="flex flex-col gap-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
            </TabsContent>

            <TabsContent value="apply" className="mt-0">
              <CardContent className="flex flex-col gap-6">
                <Skeleton className="h-8 w-48" />
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-24 w-full" />
                </div>
                <Skeleton className="h-10 w-32" />
              </CardContent>
            </TabsContent>

            <TabsContent value="activity" className="mt-0">
              <CardContent className="flex flex-col gap-4">
                <Skeleton className="h-8 w-40" />
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 flex flex-col gap-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </TabsContent>
          </Card>
        </Tabs>

        {/* Sidebar - visible on desktop only */}
        <aside className="hidden lg:flex w-1/5 flex-col gap-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {service.applications?.map((application) => (
                <Button
                  key={application.id}
                  className="w-full bg-bcgov-blue hover:bg-bcgov-blue/80 h-auto whitespace-normal py-2"
                  render={
                    <Link
                      to="/app/services/$serviceSlug/apply/$applicationId"
                      params={{
                        serviceSlug: service.slug,
                        applicationId: application.id,
                      }}
                    />
                  }
                >
                  Apply for {application.name}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Recommended Reading</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Help and Support</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Service Providers</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Legal</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-4/5" />
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Related Services</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Other sidebar cards - visible on mobile only */}
      <div className="flex flex-col gap-4 lg:hidden">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Recommended Reading</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6" />
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Help and Support</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Service Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Legal</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-4/5" />
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Related Services</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-4 w-5/6" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NotFoundComponent() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-extrabold">Service not found</h1>
      <p className="text-muted-foreground">
        The service you're looking for doesn't exist.
      </p>
      <Link to="/app/services" className="text-primary hover:underline">
        Back to services
      </Link>
    </div>
  );
}

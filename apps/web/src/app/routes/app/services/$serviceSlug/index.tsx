import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui";
import { IconChevronDown } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { LexicalContent } from "../../../../../features/services/components/lexical-content.component";
import { ServicePageNavigation } from "../../../../../features/services/components/service-page-navigation.component";
import { servicesQueryOptions } from "../../../../../features/services/data/services.query";
import { queryClient } from "../../../../../lib/react-query.client";

export const Route = createFileRoute("/app/services/$serviceSlug/")({
  loader: async ({ params }) => {
    const services = await queryClient.ensureQueryData(servicesQueryOptions);
    const service = services.find((s) => s.slug === params.serviceSlug);
    if (!service) {
      throw notFound();
    }
    return { service };
  },
  staticData: {
    breadcrumbs: (loaderData?: { service: { name: string } }) => [
      { label: "Services", to: "/app/services" },
      ...(loaderData?.service ? [{ label: loaderData.service.name }] : []),
    ],
  },
  component: RouteComponent,
  notFoundComponent: NotFoundComponent,
});

function RouteComponent() {
  const { data: services } = useSuspenseQuery(servicesQueryOptions);
  const { service: loaderService } = Route.useLoaderData();
  const service =
    services.find((s) => s.slug === loaderService.slug) ?? loaderService;
  const descriptionRef = useRef<HTMLHeadingElement>(null);
  const [isStickyHeaderVisible, setStickyHeaderVisible] = useState(false);

  useEffect(() => {
    const el = descriptionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setStickyHeaderVisible(!entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-4">
        <div className="flex flex-col gap-4 flex-1">
          <h1 className="text-2xl font-semibold">{service.name}</h1>
          <p className="text-base" ref={descriptionRef}>
            {service.description?.short}
          </p>
        </div>
        {service.applications && service.applications.length === 1 && (
          <div className="flex items-center">
            <Button>
              <Link
                to="/app/services/$serviceSlug/apply/$applicationId"
                params={{
                  serviceSlug: service.slug,
                  applicationId: service.applications[0].id,
                }}
              >
                Apply
              </Link>
            </Button>
          </div>
        )}
        {service.applications && service.applications.length > 1 && (
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button>
                  <span className="flex flex-row align-middle gap-4">
                    Apply
                    <IconChevronDown className="my-auto" />
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-50">
                {service.applications.map((app) => (
                  <DropdownMenuItem key={app.id}>
                    <Link
                      to="/app/services/$serviceSlug/apply/$applicationId"
                      params={{
                        serviceSlug: service.slug,
                        applicationId: app.id,
                      }}
                    >
                      {app.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
      <ServicePageNavigation
        serviceName={service.name}
        visible={isStickyHeaderVisible}
      />
      <div className="flex flex-col gap-4">
        {/* Overview */}
        <div id="overview" className="scroll-mt-20 flex flex-col gap-4">
          {service.content && <LexicalContent content={service.content} />}
        </div>
        {/* Eligibility criteria */}
        <div
          id="eligibility-criteria"
          className="scroll-mt-20 flex flex-col gap-4"
        >
          <h2 className="text-xl font-semibold">Eligibility criteria</h2>
          <div className="flex flex-col gap-4 min-h-48"></div>
        </div>
        {/* Application process */}
        <div
          id="application-process"
          className="scroll-mt-20 flex flex-col gap-4"
        >
          <h2 className="text-xl font-semibold">Application process</h2>
          <div className="flex flex-col gap-4 min-h-48"></div>
        </div>
        {/* Your activity */}
        <div id="your-activity" className="scroll-mt-20 flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Your activity</h2>
          <div className="flex flex-col gap-4 min-h-48"></div>
        </div>
        {/* More information */}
        <div id="more-information" className="scroll-mt-20 flex flex-col gap-4">
          <h2 className="text-xl font-semibold">More information</h2>
          <div className="flex flex-col gap-4 min-h-48"></div>
        </div>
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

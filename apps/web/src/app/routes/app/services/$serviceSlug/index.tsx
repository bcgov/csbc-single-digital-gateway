import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ServicePageNavigation } from "../../../../../features/services/components/service-page-navigation.component";
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
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">{service.name}</h1>
        <p className="text-base" ref={descriptionRef}>
          {service.description}
        </p>
      </div>
      <ServicePageNavigation
        serviceName={service.name}
        visible={isStickyHeaderVisible}
      />
      <div className="flex flex-col gap-4">
        {/* Overview */}
        <div id="overview" className="scroll-mt-20 flex flex-col gap-4">
          <h2 className="text-xl font-semibold">About</h2>
          <div className="flex flex-col gap-4 min-h-48"></div>
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

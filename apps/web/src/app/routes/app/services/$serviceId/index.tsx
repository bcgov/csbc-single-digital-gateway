import { buttonVariants } from "@repo/ui";
import { IconCake, IconPlayerPlay } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { EligibilityCriteria } from "../../../../../features/services/components/eligibility-criteria.component";
import { eligibilityCriteria } from "../../../../../features/services/components/eligibility-criteria.placeholder";
import { LegalInformationAccordion } from "../../../../../features/services/components/legal-information-accordion.component";
import { LexicalContent } from "../../../../../features/services/components/lexical-content.component";
import { OtherServicesAccordion } from "../../../../../features/services/components/other-services-accordion.component";
import { ResourcesSupportAccordion } from "../../../../../features/services/components/resources-support-accordion.component";
import { ServicePageNavigation } from "../../../../../features/services/components/service-page-navigation.component";
import { servicesQueryOptions } from "../../../../../features/services/data/services.query";
import { queryClient } from "../../../../../lib/react-query.client";

export const Route = createFileRoute("/app/services/$serviceId/")({
  loader: async ({ params }) => {
    const services = await queryClient.ensureQueryData(servicesQueryOptions);
    const service = services.find((s) => s.id === params.serviceId);
    if (!service) {
      throw notFound();
    }
    return { service };
  },
  staticData: {
    breadcrumbs: (loaderData: unknown) => {
      const data = loaderData as { service: { name: string } } | undefined;
      return [
        { label: "Services", to: "/app/services" },
        ...(data?.service ? [{ label: data.service.name }] : []),
      ];
    },
  },
  component: RouteComponent,
  notFoundComponent: NotFoundComponent,
});

function RouteComponent() {
  const { data: services = [] } = useQuery(servicesQueryOptions);
  const { service: loaderService } = Route.useLoaderData();
  const service =
    services.find((s) => s.id === loaderService.id) ?? loaderService;
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
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex flex-col gap-4 flex-1">
          <h1>{service.name}</h1>
          <p className="text-muted-foreground" ref={descriptionRef}>
            {service.description}
          </p>
        </div>
        <Link
          to="/app/services"
          className={buttonVariants({ variant: "default", size: "default" })}
        >
          <IconPlayerPlay size={16} />
          Internal button
        </Link>
        <a
          href="https://www2.gov.bc.ca"
          className={buttonVariants({ variant: "default", size: "default" })}
        >
          <IconPlayerPlay size={16} /> External button
        </a>
      </div>
      <ServicePageNavigation
        serviceName={service.name}
        visible={isStickyHeaderVisible}
      />
      <div className="lg:grid lg:grid-cols-3 gap-12">
        <div className="col-span-2">
          <div className="flex flex-col gap-4">
            {/* Overview */}
            <div
              id="overview"
              className="scroll-mt-20 flex flex-col gap-4 mb-4"
            >
              <h2>About</h2>
              <p>
                Income Assistance provides temporary financial support to help
                you meet basic needs while you work toward employment or other
                sources of income.
              </p>

              {service.content && <LexicalContent content={service.content} />}
            </div>
            {/* Eligibility criteria */}
            <div
              id="eligibility-criteria"
              className="scroll-mt-20 flex flex-col gap-4 mb-4"
            >
              <h2 className="section-heading">Eligibility criteria</h2>
              <div className="flex flex-col gap-4 min-h-48">
                <p>
                  Income Assistance provides temporary financial support to help
                  you meet basic needs while you work toward employment or other
                  sources of income.
                </p>
                <h3>Criteria</h3>
                <EligibilityCriteria criteria={eligibilityCriteria} />
              </div>
            </div>
            {/* Application process */}
            <div
              id="application-process"
              className="scroll-mt-20 flex flex-col gap-4 mb-4"
            >
              <h2 className="section-heading">Application process</h2>
              <div className="flex flex-col gap-4 min-h-48">
                <p>
                  The application requires you to submit a lot of documents and
                  the forms could be lengthy. You don't have to do this alone,
                  you could seek the help of:
                </p>
                <ol className="list-inside pl-2 list-decimal">
                  <li>
                    <a href="#">Staff at our offices</a>
                  </li>
                  <li>
                    <a href="#">Other organizations that provide support</a>
                  </li>
                  <li>
                    <a href="#">A family member or friend</a>
                  </li>
                </ol>
                <p>You can apply in two ways:</p>
                <div className="flex flex-col gap-px border bg-border">
                  <div className="grid grid-cols-2 gap-px">
                    <Link
                      to={"#foo" as string}
                      className="flex flex-col items-center bg-white p-4"
                    >
                      <span className="p-4 bg-blue-10 inline-flex">
                        <IconCake
                          className="shrink-0 pb-2"
                          size={42}
                          stroke={1.5}
                          color="#1e5189"
                        />
                      </span>
                      <p className="font-bold py-2">Online application</p>
                      <p>Apply online through MyBC</p>
                    </Link>
                    <Link
                      to={"#bar" as string}
                      className="flex flex-col items-center bg-white p-4"
                    >
                      <span className="p-4 bg-blue-10 inline-flex">
                        <IconCake
                          className="shrink-0 pb-2"
                          size={42}
                          stroke={1.5}
                          color="#1e5189"
                        />
                      </span>
                      <p className="font-bold py-2">Paper form</p>
                      <p>You can apply by mail or in person</p>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            {/* Your activity */}
            <div
              id="your-activity"
              className="scroll-mt-20 flex flex-col gap-4 mb-4"
            >
              <h2 className="section-heading">Your activity</h2>
              <div className="flex flex-col gap-4 min-h-48">
                <p>Track your applications and view updates in one place.</p>
                <div className="flex flex-col gap-px border bg-border">
                  <div className="grid gap-px">
                    <div className="flex flex-col items-center bg-white p-4">
                      <IconCake
                        className="shrink-0 pb-4"
                        size={48}
                        stroke={1.5}
                        color="#1e5189"
                      />
                      <p className="font-bold pb-2">No applications yet</p>
                      <p className="pb-3">
                        You have not applied for Income Assistance.
                      </p>
                      <p>
                        <a href="#">Start online application</a>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* More information */}
            <div
              id="more-information"
              className="scroll-mt-20 flex flex-col gap-4 mb-4"
            >
              <h2 className="section-heading">More information</h2>
              <div className="flex flex-col gap-4 min-h-48"></div>
            </div>
          </div>
        </div>
        <div className="col-span-1">
          <div className="flex flex-col gap-6">
            <ResourcesSupportAccordion />
            <OtherServicesAccordion />
            <LegalInformationAccordion />
          </div>
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
      <Link to="/app/services">Back to services</Link>
    </div>
  );
}

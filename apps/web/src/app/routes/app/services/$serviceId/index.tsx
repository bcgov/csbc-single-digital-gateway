import {
  AccordionContent,
  AccordionGroup,
  AccordionItem,
  AccordionTrigger,
} from "@repo/ui";
import slugify from "@sindresorhus/slugify";
import { IconCake } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { LegalInformationAccordion } from "../../../../../features/services/components/legal-information-accordion.component";
import { LexicalContent } from "../../../../../features/services/components/lexical-content.component";
import { OtherServicesAccordion } from "../../../../../features/services/components/other-services-accordion.component";
import { ResourcesSupportAccordion } from "../../../../../features/services/components/resources-support-accordion.component";
import { ServicePageNavigation } from "../../../../../features/services/components/service-page-navigation.component";
import { StartApplicationButton } from "../../../../../features/services/components/start-application-button.component";
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
          {service.description && (
            <p className="text-muted-foreground" ref={descriptionRef}>
              {service.description}
            </p>
          )}
        </div>
        <StartApplicationButton service={service} />
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
              {service.content?.about && (
                <>
                  <h2>About</h2>
                  <p>
                    <LexicalContent
                      content={JSON.parse(service.content?.about)}
                    />
                  </p>
                </>
              )}

              {service.content?.audience && (
                <>
                  <h2>Who is it for?</h2>
                  <p>
                    <LexicalContent
                      content={JSON.parse(service.content?.audience)}
                    />
                  </p>
                </>
              )}

              {service.content?.considerations && (
                <>
                  <h2>What to consider</h2>
                  <p>
                    <LexicalContent
                      content={JSON.parse(service.content?.considerations)}
                    />
                  </p>
                </>
              )}

              {service.content?.outcomes && (
                <>
                  <h2>What you'll get</h2>
                  <p>
                    <LexicalContent
                      content={JSON.parse(service.content?.outcomes)}
                    />
                  </p>
                </>
              )}
            </div>
            {/* Data & privacy */}
            {/* {service.settings?.consent && (
              <div
                id="data-and-privacy"
                className="scroll-mt-20 flex flex-col gap-4 mb-4"
              >
                <h2 className="section-heading">Data & privacy</h2>
                <div className="flex flex-col gap-4">
                  <span>
                    <ConsentDocumentsAccordion
                      documentIds={(service.settings?.consent ?? []).map(
                        ({ documentId }) => documentId,
                      )}
                    />
                  </span>
                </div>
              </div>
            )} */}
            {/* Eligibility criteria */}
            {/* <div
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
                <span className="border">
                  <EligibilityCriteria criteria={eligibilityCriteria} />
                </span>
              </div>
            </div> */}
            {/* Application process */}
            <div
              id="application-process"
              className="scroll-mt-20 flex flex-col gap-4 mb-4"
            >
              <h2 className="section-heading">Application process</h2>
              <div className="flex flex-col gap-4 min-h-48">
                {/* {!service.application?.description &&
                  (!service.application?.applications ||
                    service.application.applications.length === 0) && (
                    <p className="text-muted-foreground">
                      No application process information is available.
                    </p>
                  )} */}

                {/* {service.application?.description && (
                  <span>
                    <LexicalContent content={service.application.description} />
                  </span>
                )} */}

                {/* {service.application?.applications &&
                  service.application.applications.length > 0 && (
                    <div className="flex flex-col gap-px border bg-border">
                      <div
                        className={cn(
                          "grid gap-px",
                          service.application.applications.length > 1 &&
                            "grid-cols-2 md:grid-cols-3",
                        )}
                      >
                        {service.application.applications
                          .filter((app) => app.online?.[0]?.url)
                          .map((app) => {
                            const online = app.online?.[0];

                            if (!online?.url) return null; // satisfies TS/linter

                            return (
                              <a
                                key={online.id}
                                href={online.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center bg-white p-4 text-center no-underline hover:bg-accent"
                              >
                                <span className="p-4 bg-blue-10 inline-flex">
                                  <IconCake
                                    size={42}
                                    stroke={1.5}
                                    color="#1e5189"
                                  />
                                </span>

                                <p className="font-bold py-2">{online.label}</p>

                                {online.description && (
                                  <p>{online.description}</p>
                                )}
                              </a>
                            );
                          })}
                      </div>
                    </div>
                  )} */}
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
              <div className="flex flex-col gap-4 min-h-48">
                {service.content?.faq && service.content.faq.length > 0 && (
                  <AccordionGroup
                    title="FAQs"
                    values={service.content.faq.map((item) =>
                      slugify(item.question),
                    )}
                  >
                    {service.content?.faq.map((item) => (
                      <AccordionItem
                        key={slugify(item.question)}
                        value={slugify(item.question)}
                      >
                        <AccordionTrigger>{item.question}</AccordionTrigger>
                        <AccordionContent>
                          <LexicalContent content={JSON.parse(item.answer)} />
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </AccordionGroup>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-1">
          <div className="flex flex-col gap-6">
            <span>
              <ResourcesSupportAccordion service={service} />
              <OtherServicesAccordion service={service} />
              <LegalInformationAccordion service={service} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// function ConsentDocumentsAccordion({ documentIds }: { documentIds: string[] }) {
//   const { data: documents = [] } = useQuery(
//     consentDocumentsByIdQueryOptions(documentIds),
//   );

//   if (documents.length === 0) return null;

//   return (
//     <AccordionGroup
//       title="Privacy statements"
//       description="Before you proceed with the application, you will be prompted to agree to the following:"
//       values={documents.map((doc) => doc.id)}
//     >
//       {documents.map((doc) => (
//         <AccordionItem key={doc.id} value={doc.id}>
//           <AccordionTrigger>{doc.name}</AccordionTrigger>
//           <AccordionContent>
//             {doc.content ? (
//               <LexicalContent content={doc.content} />
//             ) : (
//               <p className="text-muted-foreground">No content available.</p>
//             )}
//           </AccordionContent>
//         </AccordionItem>
//       ))}
//     </AccordionGroup>
//   );
// }

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

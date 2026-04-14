import {
  AccordionContent,
  AccordionGroup,
  AccordionItem,
  AccordionTrigger,
} from "@repo/ui";
import { IconCake } from "@tabler/icons-react";
import { ExternalLink } from "./external-link.component";
import { NavLinkItem } from "./nav-link.component";

import type { ServiceDto } from "../../../features/services/service.dto";

type Props = {
  service: ServiceDto;
};

export function ResourcesSupportAccordion({ service }: Props) {
  const hasRecommendedReading = !!service.resources?.recommendedReading?.length;

  const rawContactMethods = service.resources?.contactMethods;

  const contactMethods = [
    ...(rawContactMethods?.web?.map((item) => ({
      id: item.id,
      title: item.label ?? "Website",
      description: item.description ?? undefined,
      meta: undefined,
      to: item.value,
    })) ?? []),

    ...(rawContactMethods?.email?.map((item) => ({
      id: item.id,
      title: item.label ?? "Email",
      description: item.description ?? undefined,
      meta: undefined,
      to: item.value ? `mailto:${item.value}` : undefined,
    })) ?? []),

    ...(rawContactMethods?.phone?.map((item) => ({
      id: item.id,
      title: item.label ?? "Phone",
      description: item.description ?? undefined,
      meta: undefined,
      to: item.value ? `tel:${item.value}` : undefined,
    })) ?? []),

    ...(rawContactMethods?.fax?.map((item) => ({
      id: item.id,
      title: item.label ?? "Fax",
      description: item.description ?? undefined,
      meta: undefined,
      to: item.value ? `fax:${item.value}` : undefined,
    })) ?? []),

    ...(rawContactMethods?.address?.map((item) => ({
      id: item.id,
      title: item.label ?? "Address",
      description: item.description ?? undefined,
      meta: [
        item.addressOne,
        item.addressTwo,
        [item.city, item.province].filter(Boolean).join(", "),
        item.country,
      ]
        .filter(Boolean)
        .join(", "),
      to: undefined,
    })) ?? []),
  ];

  const hasContactMethods = contactMethods.length > 0;
  const hasApplicationSupport = !!service.resources?.applicationSupport?.length;

  if (!hasRecommendedReading && !hasContactMethods && !hasApplicationSupport) {
    return null;
  }

  return (
    <AccordionGroup
      title="Resources & Support"
      values={[
        ...(hasRecommendedReading ? ["recommended-reading"] : []),
        ...(hasContactMethods ? ["contact-methods"] : []),
        ...(hasApplicationSupport ? ["application-support"] : []),
      ]}
    >
      {hasRecommendedReading && (
        <AccordionItem value="recommended-reading">
          <AccordionTrigger>Recommended reading</AccordionTrigger>
          <AccordionContent className="p-0">
            <div className="px-4 py-3">
              <ul className="space-y-2">
                {service.resources?.recommendedReading?.map((item) => (
                  <li key={item.id}>
                    <ExternalLink href={item.url}>{item.label}</ExternalLink>
                  </li>
                ))}
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {hasContactMethods && (
        <AccordionItem value="contact-methods">
          <AccordionTrigger>Get help</AccordionTrigger>
          <AccordionContent className="p-0">
            <ul className="divide-y divide-neutral-300">
              {contactMethods.map((item) => (
                <li key={item.id}>
                  <NavLinkItem
                    to={item.to}
                    icon={
                      <IconCake
                        size={20}
                        stroke={1.5}
                        className="text-bcgov-blue"
                      />
                    }
                    title={item.title}
                    description={item.description}
                    meta={item.meta}
                  />
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      )}

      {hasApplicationSupport && (
        <AccordionItem value="application-support">
          <AccordionTrigger>Application support</AccordionTrigger>
          <AccordionContent className="p-0">
            <ul className="divide-y divide-neutral-300">
              {service.resources?.applicationSupport?.map((item) => (
                <li key={item.id}>
                  <NavLinkItem
                    to={item.value}
                    icon={
                      <IconCake
                        size={20}
                        stroke={1.5}
                        className="text-bcgov-blue"
                      />
                    }
                    title={item.label}
                    description={item.description ?? undefined}
                  />
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      )}
    </AccordionGroup>
  );
}

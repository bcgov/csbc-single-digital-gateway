import {
  AccordionContent,
  AccordionGroup,
  AccordionItem,
  AccordionTrigger,
} from "@repo/ui";
import { IconCake } from "@tabler/icons-react";
import type { ServiceDto } from "../../../features/services/service.dto";
import { NavLinkItem } from "./nav-link.component";

type Props = {
  service: ServiceDto;
};

export function OtherServicesAccordion({ service }: Props) {
  const relatedServices =
    service.content?.resources?.otherServices?.relatedServices;
  const recommendedServices =
    service.content?.resources?.otherServices?.recommendedServices;

  const hasRelatedServices = !!relatedServices && relatedServices.length > 0;
  const hasRecommendedServices =
    !!recommendedServices && recommendedServices.length > 0;

  if (!hasRelatedServices && !hasRecommendedServices) {
    return null;
  }

  return (
    <AccordionGroup
      title="Other services"
      values={[
        ...(hasRelatedServices ? ["related-services"] : []),
        ...(hasRecommendedServices ? ["recommended-services"] : []),
      ]}
    >
      {hasRelatedServices && (
        <AccordionItem value="related-services">
          <AccordionTrigger>Related services</AccordionTrigger>
          <AccordionContent className="p-0">
            <ul className="divide-y divide-neutral-300">
              {relatedServices.map((_, index) => (
                <li key={index}>
                  <NavLinkItem
                    to="#"
                    icon={
                      <IconCake
                        size={20}
                        stroke={1.5}
                        className="text-bcgov-blue"
                      />
                    }
                    title="Related service"
                  />
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      )}

      {hasRecommendedServices && (
        <AccordionItem value="recommended-services">
          <AccordionTrigger>Recommended services</AccordionTrigger>
          <AccordionContent className="p-0">
            <ul className="divide-y divide-neutral-300">
              {recommendedServices.map((_, index) => (
                <li key={index}>
                  <NavLinkItem
                    to="#"
                    icon={
                      <IconCake
                        size={20}
                        stroke={1.5}
                        className="text-bcgov-blue"
                      />
                    }
                    title="Recommended service"
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

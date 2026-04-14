import {
  AccordionContent,
  AccordionGroup,
  AccordionItem,
  AccordionTrigger,
} from "@repo/ui";
import { ExternalLink } from "./external-link.component";

import type { ServiceDto } from "../../../features/services/service.dto";

type Props = {
  service: ServiceDto;
};

export function LegalInformationAccordion({ service }: Props) {
  const hasLegalInformation = !!service.resources?.legal?.length;

  if (!hasLegalInformation) {
    return null;
  }

  return (
    <AccordionGroup
      title="Legal information"
      values={["policy-and-legislation"]}
    >
      <AccordionItem value="policy-and-legislation">
        <AccordionTrigger>Policy and legislation</AccordionTrigger>
        <AccordionContent className="p-0">
          <div className="px-4 py-3">
            <ul className="space-y-2">
              {service.resources?.legal?.map((item) => (
                <li key={item.id}>
                  <ExternalLink href={item.value}>{item.label}</ExternalLink>
                </li>
              ))}
            </ul>
          </div>
        </AccordionContent>
      </AccordionItem>
    </AccordionGroup>
  );
}

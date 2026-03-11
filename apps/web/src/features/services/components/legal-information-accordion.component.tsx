import {
  AccordionContent,
  AccordionGroup,
  AccordionItem,
  AccordionTrigger,
} from "@repo/ui";
import { ExternalLink } from "./external-link.component";

export function LegalInformationAccordion() {
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
              <li>
                <ExternalLink href="https://gov.bc.ca">
                  BC Government Services Employment and Assistance Act and
                  Regulations
                </ExternalLink>
              </li>
              <li>
                <ExternalLink href="https://gov.bc.ca">
                  Employment and Assistance for Persons with Disabilities Act
                  and Regulations
                </ExternalLink>
              </li>
            </ul>
          </div>
        </AccordionContent>
      </AccordionItem>
    </AccordionGroup>
  );
}

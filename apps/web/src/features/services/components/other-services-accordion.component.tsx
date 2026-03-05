import {
  AccordionContent,
  AccordionGroup,
  AccordionItem,
  AccordionTrigger,
} from "@repo/ui";
import { IconCake } from "@tabler/icons-react";
import { NavLinkItem } from "./nav-link.component";

export function OtherServicesAccordion() {
  return (
    <AccordionGroup
      title="Other services"
      values={["related-services", "recommended-services"]}
    >
      <AccordionItem value="related-services">
        <AccordionTrigger>Related services</AccordionTrigger>
        <AccordionContent className="p-0">
          <ul className="divide-y divide-neutral-300">
            <li>
              <NavLinkItem
                to="#"
                icon={
                  <IconCake
                    size={20}
                    stroke={1.5}
                    className="text-bcgov-blue"
                  />
                }
                title="Disability Assistance"
              />
            </li>
            <li>
              <NavLinkItem
                to="#"
                icon={
                  <IconCake
                    size={20}
                    stroke={1.5}
                    className="text-bcgov-blue"
                  />
                }
                title="Call us"
              />
            </li>
          </ul>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="recommended-services">
        <AccordionTrigger>Recommended services</AccordionTrigger>
        <AccordionContent className="p-0">
          <ul className="divide-y divide-neutral-300">
            <li>
              <NavLinkItem
                to="#"
                icon={
                  <IconCake
                    size={20}
                    stroke={1.5}
                    className="text-bcgov-blue"
                  />
                }
                title="Persons with Persistent Multiple Barriers"
              />
            </li>
            <li>
              <NavLinkItem
                to="#"
                icon={
                  <IconCake
                    size={20}
                    stroke={1.5}
                    className="text-bcgov-blue"
                  />
                }
                title="Hardship Assistance"
              />
            </li>
          </ul>
        </AccordionContent>
      </AccordionItem>
    </AccordionGroup>
  );
}

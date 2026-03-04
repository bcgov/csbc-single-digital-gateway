import {
  AccordionContent,
  AccordionGroup,
  AccordionItem,
  AccordionTrigger,
} from "@repo/ui";
import { IconCake } from "@tabler/icons-react";
import { ExternalLink } from "./external-link.component";
import { NavLinkItem } from "./nav-link.component";

export function ResourcesSupportAccordion() {
  return (
    <AccordionGroup
      title="Resources & Support"
      values={["recommended-reading", "get-help", "application-support"]}
    >
      <AccordionItem value="recommended-reading">
        <AccordionTrigger>Recommended reading</AccordionTrigger>
        <AccordionContent className="p-0">
          <div className="px-4 py-3">
            <ul className="space-y-2">
              <li>
                <ExternalLink href="https://gov.bc.ca">
                  Apply for assistance
                </ExternalLink>
              </li>
              <li>
                <ExternalLink href="https://gov.bc.ca">
                  On assistance
                </ExternalLink>
              </li>
              <li>
                <ExternalLink href="https://gov.bc.ca">
                  Payment dates
                </ExternalLink>
              </li>
              <li>
                <ExternalLink href="https://gov.bc.ca">
                  Access services
                </ExternalLink>
              </li>
            </ul>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="get-help">
        <AccordionTrigger>Get help</AccordionTrigger>
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
                title="Help center"
                description="Help and support resources."
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
                title="Income Assistance Office"
                description="Run by the Ministry of Social Development and Poverty Reduction"
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
                title="Report fraud"
                description="reportfraud@gov.bc.ca"
              />
            </li>
          </ul>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="application-support">
        <AccordionTrigger>Application support</AccordionTrigger>
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
                title="Call us"
                description="Toll Free: 1-866-866-08666"
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
                title="Service B.C."
                description="Run by the Ministry of Citizens' Services"
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
                title="Public Guardian and Trustee of BC"
                description="We work for British Columbians to protect the legal and
                  financial interests of children under the age of 19 years,
                  protect the legal, financial, personal and health care
                  interests of adults who need help with decision making, and
                  administer estates of deceased and missing persons."
              />
            </li>
          </ul>
        </AccordionContent>
      </AccordionItem>
    </AccordionGroup>
  );
}

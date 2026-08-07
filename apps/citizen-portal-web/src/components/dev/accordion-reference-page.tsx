import { mdiCake } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@repo/ui/accordion';
import { AccordionGroup } from '@repo/ui/accordion-group';
import { getA11yMetadata } from '@/a11y/a11y-catalog';
import { A11yRulesSection } from '@/components/dev/a11y-rules-section';
import { CodeBlock } from '@/components/dev/code-block';
import { DevPageLayout } from '@/components/dev/dev-page-layout';
import type { DevNavItem } from '@/components/dev/dev-page-nav';
import { DevSection } from '@/components/dev/dev-section';
import { ExamplePreview } from '@/components/dev/example-preview';
import { ExternalLink } from '@/components/dev/external-link';
import { NavLinkItem } from '@/components/dev/nav-link-item';
import { PropTable } from '@/components/dev/prop-table';

const navItems: DevNavItem[] = [
  { id: 'full-example', text: 'Full example', level: 2 },
  { id: 'usage', text: 'Usage', level: 2 },
  { id: 'composition', text: 'Composition', level: 2 },
  { id: 'basic', text: 'Basic accordion', level: 2 },
  { id: 'group', text: 'Accordion group', level: 2 },
  { id: 'accessibility', text: 'Accessibility', level: 2 },
  { id: 'api-reference', text: 'API reference', level: 2 },
];

const FULL_EXAMPLE_CODE = `<AccordionGroup
  title="Resources & Support"
  values={["recommended-reading", "application-support"]}
>
  <AccordionItem value="recommended-reading">
    <AccordionTrigger>Recommended reading</AccordionTrigger>
    <AccordionContent className="p-0">
      <div className="px-4 py-3">
        <ul className="space-y-2">
          <li>
            <ExternalLink href="https://gov.bc.ca">Apply for assistance</ExternalLink>
          </li>
          <li>
            <ExternalLink href="https://gov.bc.ca">On assistance</ExternalLink>
          </li>
        </ul>
      </div>
    </AccordionContent>
  </AccordionItem>

  <AccordionItem value="application-support">
    <AccordionTrigger>Application support</AccordionTrigger>
    <AccordionContent className="p-0">
      <ul className="divide-y divide-neutral-300">
        <li>
          <NavLinkItem
            icon={<Icon path={mdiCake} size="20px" className="text-bcgov-blue" />}
            title="Service B.C."
            description="Run by the Ministry of Citizens' Services"
          />
        </li>
      </ul>
    </AccordionContent>
  </AccordionItem>
</AccordionGroup>`;

const USAGE_IMPORT_CODE = `import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@repo/ui/accordion";
import { AccordionGroup } from "@repo/ui/accordion-group";`;

const USAGE_SKELETON_CODE = `<AccordionGroup title="Section title" values={["item-1"]}>
  <AccordionItem value="item-1">
    <AccordionTrigger>Trigger</AccordionTrigger>
    <AccordionContent>Content</AccordionContent>
  </AccordionItem>
</AccordionGroup>`;

const COMPOSITION_TREE = `AccordionGroup
└── Accordion
    └── AccordionItem
        ├── AccordionTrigger
        └── AccordionContent`;

const BASIC_CODE = `<Accordion className="w-full">
  <AccordionItem value="item-1">
    <AccordionTrigger>Is it accessible?</AccordionTrigger>
    <AccordionContent>Yes — built on base-ui, which handles the aria wiring.</AccordionContent>
  </AccordionItem>
  <AccordionItem value="item-2">
    <AccordionTrigger>Can more than one be open?</AccordionTrigger>
    <AccordionContent>
      Only with the multiple prop — by default opening one closes the others.
    </AccordionContent>
  </AccordionItem>
</Accordion>`;

const GROUP_CODE = `<AccordionGroup
  title="Resources & Support"
  values={["recommended-reading", "application-support"]}
>
  <AccordionItem value="recommended-reading">
    <AccordionTrigger>Recommended reading</AccordionTrigger>
    <AccordionContent className="p-0">
      <div className="px-4 py-3">
        <ul className="space-y-2">
          <li>
            <ExternalLink href="https://gov.bc.ca">Apply for assistance</ExternalLink>
          </li>
          <li>
            <ExternalLink href="https://gov.bc.ca">On assistance</ExternalLink>
          </li>
        </ul>
      </div>
    </AccordionContent>
  </AccordionItem>

  <AccordionItem value="application-support">
    <AccordionTrigger>Application support</AccordionTrigger>
    <AccordionContent className="p-0">
      <ul className="divide-y divide-neutral-300">
        <li>
          <NavLinkItem
            icon={<Icon path={mdiCake} size="20px" className="text-bcgov-blue" />}
            title="Service B.C."
            description="Run by the Ministry of Citizens' Services"
          />
        </li>
        <li>
          <NavLinkItem
            icon={<Icon path={mdiCake} size="20px" className="text-bcgov-blue" />}
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
</AccordionGroup>`;

export function AccordionReferencePage() {
  return (
    <DevPageLayout
      title="Accordion"
      description="A vertically stacked set of interactive headings, each revealing a section of content."
      navItems={navItems}
      navLabel="On this page"
      navClassName="sticky top-0 h-screen overflow-y-auto"
    >
      <DevSection id="full-example" title="Full example">
        <ExamplePreview code={FULL_EXAMPLE_CODE}>
          <AccordionGroup
            title="Resources & Support"
            values={['recommended-reading', 'application-support']}
          >
            <AccordionItem value="recommended-reading">
              <AccordionTrigger>Recommended reading</AccordionTrigger>
              <AccordionContent className="p-0">
                <div className="px-4 py-3">
                  <ul className="space-y-2">
                    <li>
                      <ExternalLink href="https://gov.bc.ca">Apply for assistance</ExternalLink>
                    </li>
                    <li>
                      <ExternalLink href="https://gov.bc.ca">On assistance</ExternalLink>
                    </li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="application-support">
              <AccordionTrigger>Application support</AccordionTrigger>
              <AccordionContent className="p-0">
                <ul className="divide-y divide-neutral-300">
                  <li>
                    <NavLinkItem
                      icon={<Icon path={mdiCake} size="20px" className="text-bcgov-blue" />}
                      title="Service B.C."
                      description="Run by the Ministry of Citizens' Services"
                    />
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </AccordionGroup>
        </ExamplePreview>
      </DevSection>

      <DevSection id="usage" title="Usage">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium">Import</p>
            <CodeBlock code={USAGE_IMPORT_CODE} label="import statement" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Skeleton</p>
            <CodeBlock code={USAGE_SKELETON_CODE} label="skeleton" />
          </div>
        </div>
      </DevSection>

      <DevSection
        id="composition"
        title="Composition"
        description="AccordionGroup is our addition — it wraps Accordion and manages open state for you (title/description header + expand-all/collapse-all)."
      >
        <CodeBlock code={COMPOSITION_TREE} />
      </DevSection>

      <DevSection
        id="basic"
        title="Basic accordion"
        description="Accordion directly, no group wrapper — single item open at a time by default."
      >
        <ExamplePreview code={BASIC_CODE}>
          <Accordion className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>Is it accessible?</AccordionTrigger>
              <AccordionContent>
                Yes — built on base-ui, which handles the aria wiring.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>Can more than one be open?</AccordionTrigger>
              <AccordionContent>
                Only with the multiple prop — by default opening one closes the others.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </ExamplePreview>
      </DevSection>

      <DevSection
        id="group"
        title="Accordion group"
        description="AccordionGroup adds a title/description header and an expand-all/collapse-all control. NavLinkItem and ExternalLink are custom components created for the sidebar accordions."
      >
        <ExamplePreview code={GROUP_CODE}>
          <AccordionGroup
            title="Resources & Support"
            values={['recommended-reading', 'application-support']}
          >
            <AccordionItem value="recommended-reading">
              <AccordionTrigger>Recommended reading</AccordionTrigger>
              <AccordionContent className="p-0">
                <div className="px-4 py-3">
                  <ul className="space-y-2">
                    <li>
                      <ExternalLink href="https://gov.bc.ca">Apply for assistance</ExternalLink>
                    </li>
                    <li>
                      <ExternalLink href="https://gov.bc.ca">On assistance</ExternalLink>
                    </li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="application-support">
              <AccordionTrigger>Application support</AccordionTrigger>
              <AccordionContent className="p-0">
                <ul className="divide-y divide-neutral-300">
                  <li>
                    <NavLinkItem
                      icon={<Icon path={mdiCake} size="20px" className="text-bcgov-blue" />}
                      title="Service B.C."
                      description="Run by the Ministry of Citizens' Services"
                    />
                  </li>
                  <li>
                    <NavLinkItem
                      icon={<Icon path={mdiCake} size="20px" className="text-bcgov-blue" />}
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
        </ExamplePreview>
      </DevSection>

      <DevSection id="accessibility" title="Accessibility">
        <A11yRulesSection metadata={getA11yMetadata('accordion')} />
      </DevSection>

      <DevSection id="api-reference" title="API reference">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium">Accordion</p>
            <PropTable
              rows={[
                ['multiple', 'boolean', 'false', 'Allow more than one item open at once.'],
                ['value / onValueChange', 'AccordionValue', '—', 'Controlled open item(s).'],
              ]}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">AccordionItem</p>
            <PropTable rows={[['value', 'string', '—', 'Unique identifier for this item.']]} />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">AccordionGroup</p>
            <PropTable
              rows={[
                ['title', 'string', '—', 'Optional header above the accordion.'],
                ['description', 'string', '—', 'Optional supporting text under the title.'],
                [
                  'values',
                  'AccordionValue',
                  '[]',
                  "Every item's value — required for expand-all/collapse-all to work.",
                ],
                ['defaultValue', 'AccordionValue', '[]', 'Items open on initial render.'],
              ]}
            />
          </div>
        </div>
      </DevSection>
    </DevPageLayout>
  );
}

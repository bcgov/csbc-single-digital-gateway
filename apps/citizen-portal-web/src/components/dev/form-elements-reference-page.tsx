import { useState } from 'react';
import { JsonForms, type JsonSchema, type UISchemaElement } from '@repo/react/jsonforms';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@repo/ui/accordion';
import { getA11yMetadata } from '@/a11y/a11y-catalog';
import { A11yRulesSection } from '@/components/dev/a11y-rules-section';
import { CodeBlock } from '@/components/dev/code-block';
import { DevPageLayout } from '@/components/dev/dev-page-layout';
import type { DevNavItem } from '@/components/dev/dev-page-nav';
import { DevSection } from '@/components/dev/dev-section';
import { ExamplePreview } from '@/components/dev/example-preview';

const navItems: DevNavItem[] = [
  { id: 'full-example', text: 'Full example', level: 2 },
  { id: 'usage', text: 'Usage', level: 2 },
  { id: 'text', text: 'Text controls', level: 2 },
  { id: 'numeric', text: 'Numeric controls', level: 2 },
  { id: 'boolean', text: 'Boolean controls', level: 2 },
  { id: 'selection', text: 'Selection controls', level: 2 },
  { id: 'date-time', text: 'Date & time controls', level: 2 },
  { id: 'phone', text: 'Phone', level: 2 },
  { id: 'rich-text', text: 'Rich text', level: 2 },
  { id: 'address', text: 'Address', level: 2 },
  { id: 'contact-methods', text: 'Contact methods', level: 2 },
  { id: 'accessibility', text: 'Accessibility', level: 2 },
];

const TOGGLE_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    notifications: {
      type: 'boolean',
    },
  },
};

const TOGGLE_UISCHEMA: UISchemaElement = {
  type: 'VerticalLayout',
  elements: [
    {
      type: 'Control',
      scope: '#/properties/notifications',
      label: 'Email me about updates',
      options: { toggle: true },
    },
  ],
};

const FULL_EXAMPLE_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    firstName: { type: 'string', description: 'Your legal first name' },
    province: {
      type: 'string',
      enum: ['BC', 'AB', 'SK', 'MB', 'ON', 'QC', 'NB', 'NS', 'PE', 'NL'],
    },
    acceptTerms: { type: 'boolean' },
  },
  required: ['firstName'],
};

const FULL_EXAMPLE_UISCHEMA: UISchemaElement = {
  type: 'VerticalLayout',
  elements: [
    { type: 'Control', scope: '#/properties/firstName', label: 'First name' },
    { type: 'Control', scope: '#/properties/province', label: 'Province' },
    {
      type: 'Control',
      scope: '#/properties/acceptTerms',
      label: 'I accept the terms and conditions',
    },
  ],
};

// Groups the per-primitive `.a11y.ts` sidecars under the same headings the page itself uses, so
// "Accessibility" reads as a control-by-control review rather than one flat blob. A primitive
// reused across two headings (e.g. Input backs both text and number controls) is only rendered
// once, under its first/primary heading, with a short pointer note under the reused-in heading.
const A11Y_ELEMENT_GROUPS: { title: string; components: string[]; note?: string }[] = [
  { title: 'Text controls', components: ['input', 'textarea'] },
  {
    title: 'Numeric controls',
    components: ['slider'],
    note: 'Plain number entry reuses the Input primitive documented under Text controls above.',
  },
  { title: 'Boolean controls', components: ['checkbox', 'switch'] },
  {
    title: 'Selection controls',
    components: ['select', 'radio-group'],
    note: 'Multi-select checkboxes reuse the Checkbox primitive documented under Boolean controls above.',
  },
  {
    title: 'Date & time controls',
    components: ['date-picker', 'date-range-picker', 'datetime-picker', 'time-picker'],
  },
  { title: 'Phone', components: ['phone-input'] },
  { title: 'Rich text', components: ['rich-text-input'] },
  {
    title: 'Address',
    components: ['combobox'],
    note: 'Country/province search. Fieldset structure and per-field errors are covered in "Form wrapper & error states" above.',
  },
  {
    title: 'Contact methods',
    components: ['dialog'],
    note: 'The add/edit dialog. Table structure and heading association are covered in "Form wrapper & error states" above.',
  },
];

const USAGE_IMPORT_CODE = `import { JsonForms } from "@repo/react/jsonforms";`;

const USAGE_SKELETON_CODE = `<JsonForms
  schema={schema}
  uischema={uischema}
  data={data}
  onChange={({ data }) => setData(data)}
/>`;

function schemaCode(schema: JsonSchema, uischema: UISchemaElement) {
  return `// schema\n${JSON.stringify(schema, null, 2)}\n\n// uischema\n${JSON.stringify(uischema, null, 2)}`;
}

export function FormElementsReferencePage() {
  return (
    <DevPageLayout
      title="Form Elements"
      description={
        <>
          Rendered examples and copyable patterns for JSON Forms controls. All controls use{' '}
          <code>@repo/react/jsonforms-renderers</code> via the <code>@repo/react/jsonforms</code>{' '}
          {'JsonForms'} wrapper, which registers them by default. Dispatch between controls that
          could match the same schema (e.g. a checkbox vs. a toggle switch, both booleans) is
          decided by a uischema <code>options</code> flag — see each section below.
        </>
      }
      navItems={navItems}
      navLabel="On this page"
      navClassName="sticky top-0 h-screen overflow-y-auto"
    >
      <DevSection id="full-example" title="Full example">
        <ExamplePreview code={schemaCode(FULL_EXAMPLE_SCHEMA, FULL_EXAMPLE_UISCHEMA)}>
          <div className="max-w-sm">
            <FormPreview schema={FULL_EXAMPLE_SCHEMA} uischema={FULL_EXAMPLE_UISCHEMA} />
          </div>
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
        id="text"
        title="Text controls"
        description="Every string property renders as TextControl by default. options.multi swaps the single-line input for a textarea; options.mask applies an input mask."
      >
        <div className="space-y-6">
          <FormDemoCard
            title="Text input"
            schema={{
              type: 'object',
              properties: {
                firstName: {
                  type: 'string',
                  description: 'Your legal first name',
                },
              },
              required: ['firstName'],
            }}
            uischema={{
              type: 'VerticalLayout',
              elements: [
                {
                  type: 'Control',
                  scope: '#/properties/firstName',
                  label: 'First name',
                },
              ],
            }}
          />

          <FormDemoCard
            title="Textarea (options.multi)"
            schema={{
              type: 'object',
              properties: {
                notes: {
                  type: 'string',
                  description: 'Any additional context',
                },
              },
            }}
            uischema={{
              type: 'VerticalLayout',
              elements: [
                {
                  type: 'Control',
                  scope: '#/properties/notes',
                  label: 'Notes',
                  options: { multi: true },
                },
              ],
            }}
          />

          <FormDemoCard
            title="Masked input (options.mask)"
            schema={{
              type: 'object',
              properties: {
                sin: {
                  type: 'string',
                  description: 'Social Insurance Number',
                },
              },
            }}
            uischema={{
              type: 'VerticalLayout',
              elements: [
                {
                  type: 'Control',
                  scope: '#/properties/sin',
                  label: 'SIN',
                  options: { mask: '999-999-999' },
                },
              ],
            }}
          />
        </div>
      </DevSection>

      <DevSection
        id="numeric"
        title="Numeric controls"
        description="NumberControl reads min/max from the schema's minimum/maximum. Setting options.slider renders SliderControl instead, using multipleOf as the step."
      >
        <div className="space-y-6">
          <FormDemoCard
            title="Number input"
            schema={{
              type: 'object',
              properties: {
                amount: {
                  type: 'number',
                  minimum: 0,
                  maximum: 100,
                },
              },
            }}
            uischema={{
              type: 'VerticalLayout',
              elements: [
                {
                  type: 'Control',
                  scope: '#/properties/amount',
                  label: 'Amount',
                  options: { decimals: 2 },
                },
              ],
            }}
          />

          <FormDemoCard
            title="Slider (options.slider)"
            schema={{
              type: 'object',
              properties: {
                volume: {
                  type: 'number',
                  minimum: 0,
                  maximum: 100,
                  multipleOf: 5,
                },
              },
            }}
            uischema={{
              type: 'VerticalLayout',
              elements: [
                {
                  type: 'Control',
                  scope: '#/properties/volume',
                  label: 'Volume',
                  options: { slider: true },
                },
              ],
            }}
          />
        </div>
      </DevSection>

      <DevSection
        id="boolean"
        title="Boolean controls"
        description="BooleanControl renders a checkbox by default. Setting options.toggle swaps it for a switch."
      >
        <div className="space-y-6">
          <FormDemoCard
            title="Checkbox"
            schema={{
              type: 'object',
              properties: {
                acceptTerms: {
                  type: 'boolean',
                },
              },
            }}
            uischema={{
              type: 'VerticalLayout',
              elements: [
                {
                  type: 'Control',
                  scope: '#/properties/acceptTerms',
                  label: 'I accept the terms and conditions',
                },
              ],
            }}
          />

          <div className="space-y-2">
            <p className="text-sm font-medium">Toggle switch (options.toggle)</p>
            <ExamplePreview code={schemaCode(TOGGLE_SCHEMA, TOGGLE_UISCHEMA)}>
              {/* Toggle's horizontal Field pins the switch to the far edge of whatever width
                  it's given (the intended layout for a full-width settings row) — w-fit here
                  keeps just this demo's box only as wide as its content, so label and switch
                  sit next to each other instead of spanning the whole preview card. */}
              <div className="w-fit">
                <FormPreview schema={TOGGLE_SCHEMA} uischema={TOGGLE_UISCHEMA} />
              </div>
            </ExamplePreview>
          </div>
        </div>
      </DevSection>

      <DevSection
        id="selection"
        title="Selection controls"
        description={
          <>
            <code>ChoiceControl</code> (<code>options.format: &quot;choice&quot;</code>) is the
            preferred way to author a new selection field — it renders as a select, radio group, or
            checkbox group depending on <code>options.display</code>, decoupling display from the
            underlying schema shape. The enum/oneOf/multi-enum controls below remain documented
            because existing forms already use them.
          </>
        }
      >
        <div className="space-y-6">
          <FormDemoCard
            title="Enum select"
            schema={{
              type: 'object',
              properties: {
                province: {
                  type: 'string',
                  enum: ['BC', 'AB', 'SK', 'MB', 'ON', 'QC', 'NB', 'NS', 'PE', 'NL'],
                },
              },
            }}
            uischema={{
              type: 'VerticalLayout',
              elements: [
                {
                  type: 'Control',
                  scope: '#/properties/province',
                  label: 'Province',
                },
              ],
            }}
          />

          <FormDemoCard
            title="Enum radio (options.format: radio)"
            schema={{
              type: 'object',
              properties: {
                color: {
                  type: 'string',
                  enum: ['red', 'blue', 'green'],
                },
              },
            }}
            uischema={{
              type: 'VerticalLayout',
              elements: [
                {
                  type: 'Control',
                  scope: '#/properties/color',
                  label: 'Favourite colour',
                  options: { format: 'radio' },
                },
              ],
            }}
          />

          <FormDemoCard
            title="OneOf enum (schema.oneOf with const/title)"
            schema={{
              type: 'object',
              properties: {
                kind: {
                  type: 'string',
                  oneOf: [
                    { const: 'individual', title: 'Individual' },
                    { const: 'business', title: 'Business' },
                  ],
                },
              },
            }}
            uischema={{
              type: 'VerticalLayout',
              elements: [
                {
                  type: 'Control',
                  scope: '#/properties/kind',
                  label: 'Applicant type',
                },
              ],
            }}
          />

          <FormDemoCard
            title="Multi-enum checkboxes (array of enum)"
            schema={{
              type: 'object',
              properties: {
                tags: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['accessible', 'bilingual', 'online'],
                  },
                },
              },
            }}
            uischema={{
              type: 'VerticalLayout',
              elements: [
                {
                  type: 'Control',
                  scope: '#/properties/tags',
                  label: 'Service tags',
                },
              ],
            }}
          />

          <FormDemoCard
            title="Choice control — select (options.format: choice, display: select)"
            schema={{
              type: 'object',
              properties: {
                fruit: {
                  type: 'string',
                  enum: ['apple', 'pear', 'plum'],
                },
              },
            }}
            uischema={{
              type: 'VerticalLayout',
              elements: [
                {
                  type: 'Control',
                  scope: '#/properties/fruit',
                  label: 'Favourite fruit',
                  options: {
                    format: 'choice',
                    display: 'select',
                    choices: [
                      { value: 'apple', label: 'Apple' },
                      { value: 'pear', label: 'Pear' },
                      { value: 'plum', label: 'Plum' },
                    ],
                  },
                },
              ],
            }}
          />

          <FormDemoCard
            title="Choice control — radio (display: radio)"
            schema={{
              type: 'object',
              properties: {
                fruit: {
                  type: 'string',
                  enum: ['apple', 'pear', 'plum'],
                },
              },
            }}
            uischema={{
              type: 'VerticalLayout',
              elements: [
                {
                  type: 'Control',
                  scope: '#/properties/fruit',
                  label: 'Favourite fruit',
                  options: {
                    format: 'choice',
                    display: 'radio',
                    choices: [
                      { value: 'apple', label: 'Apple' },
                      { value: 'pear', label: 'Pear' },
                      { value: 'plum', label: 'Plum' },
                    ],
                  },
                },
              ],
            }}
          />

          <FormDemoCard
            title="Choice control — checkboxes (display: checkboxes, multiple)"
            schema={{
              type: 'object',
              properties: {
                fruits: {
                  type: 'array',
                  items: { type: 'string', enum: ['apple', 'pear', 'plum'] },
                },
              },
            }}
            uischema={{
              type: 'VerticalLayout',
              elements: [
                {
                  type: 'Control',
                  scope: '#/properties/fruits',
                  label: 'Fruits you like',
                  options: {
                    format: 'choice',
                    display: 'checkboxes',
                    multiple: true,
                    choices: [
                      { value: 'apple', label: 'Apple' },
                      { value: 'pear', label: 'Pear' },
                      { value: 'plum', label: 'Plum' },
                    ],
                  },
                },
              ],
            }}
          />
        </div>
      </DevSection>

      <DevSection
        id="date-time"
        title="Date & time controls"
        description="DateControl dispatches off schema format: 'date'; the others dispatch off a uischema options.format string, since their raw values (local date-time, time-of-day) don't map to a plain JSON Schema format."
      >
        <div className="space-y-6">
          <FormDemoCard
            title="Date (schema.format: date)"
            schema={{
              type: 'object',
              properties: {
                dateOfBirth: {
                  type: 'string',
                  format: 'date',
                },
              },
            }}
            uischema={{
              type: 'VerticalLayout',
              elements: [
                {
                  type: 'Control',
                  scope: '#/properties/dateOfBirth',
                  label: 'Date of birth',
                },
              ],
            }}
          />

          <FormDemoCard
            title="Date range (options.format: daterange)"
            schema={{
              type: 'object',
              properties: {
                period: {
                  type: 'object',
                  properties: {
                    start: { type: 'string', format: 'date' },
                    end: { type: 'string', format: 'date' },
                  },
                },
              },
            }}
            uischema={{
              type: 'VerticalLayout',
              elements: [
                {
                  type: 'Control',
                  scope: '#/properties/period',
                  label: 'Coverage period',
                  options: { format: 'daterange' },
                },
              ],
            }}
          />

          <FormDemoCard
            title="Date &amp; time (options.format: datetime)"
            schema={{
              type: 'object',
              properties: {
                appointmentAt: {
                  type: 'string',
                  pattern: '^\\d{4}-\\d{2}-\\d{2}T([01]\\d|2[0-3]):[0-5]\\d$',
                },
              },
            }}
            uischema={{
              type: 'VerticalLayout',
              elements: [
                {
                  type: 'Control',
                  scope: '#/properties/appointmentAt',
                  label: 'Appointment time',
                  options: { format: 'datetime' },
                },
              ],
            }}
          />

          <FormDemoCard
            title="Time (options.format: time)"
            schema={{
              type: 'object',
              properties: {
                startAt: {
                  type: 'string',
                  pattern: '^([01]\\d|2[0-3]):[0-5]\\d$',
                },
              },
            }}
            uischema={{
              type: 'VerticalLayout',
              elements: [
                {
                  type: 'Control',
                  scope: '#/properties/startAt',
                  label: 'Start time',
                  options: { format: 'time' },
                },
              ],
            }}
          />
        </div>
      </DevSection>

      <DevSection
        id="phone"
        title="Phone"
        description="options.format: 'phone' renders @repo/ui/phone-input. The stored value is a plain E.164 string (e.g. +12505551234), not an object."
      >
        <FormDemoCard
          title="Phone number"
          schema={{
            type: 'object',
            properties: {
              phoneNumber: { type: 'string' },
            },
          }}
          uischema={{
            type: 'VerticalLayout',
            elements: [
              {
                type: 'Control',
                scope: '#/properties/phoneNumber',
                label: 'Phone number',
                options: { format: 'phone' },
              },
            ],
          }}
        />
      </DevSection>

      <DevSection
        id="rich-text"
        title="Rich text"
        description="options.format: 'richtext' renders @repo/ui/rich-text-input, a Lexical-based editor. The stored value is a Lexical SerializedEditorState object, not an HTML string — leave initial data unset for a blank editor."
      >
        <FormDemoCard
          title="Rich text"
          constrainWidth={false}
          schema={{
            type: 'object',
            properties: {
              body: { type: 'object' },
            },
          }}
          uischema={{
            type: 'VerticalLayout',
            elements: [
              {
                type: 'Control',
                scope: '#/properties/body',
                label: 'Description',
                options: { format: 'richtext' },
              },
            ],
          }}
        />
      </DevSection>

      <DevSection
        id="address"
        title="Address"
        description="options.format: 'address' dispatches purely on the uischema option, not the schema shape. Field names are address_one/address_two (not line1/line2). Without a GeoDataProvider in context, the control falls back to plain free-text country/province inputs rather than the geo-lookup combobox — no live API calls happen on this page."
      >
        <FormDemoCard
          title="Address"
          schema={{
            type: 'object',
            properties: {
              addr: {
                type: 'object',
                title: 'Mailing address',
                properties: {
                  country: { type: 'string' },
                  address_one: { type: 'string' },
                  address_two: { type: 'string' },
                  city: { type: 'string' },
                  province: { type: 'string' },
                  postal_code: { type: 'string' },
                },
              },
            },
          }}
          uischema={{
            type: 'VerticalLayout',
            elements: [
              {
                type: 'Control',
                scope: '#/properties/addr',
                label: 'Mailing address',
                options: { format: 'address' },
              },
            ],
          }}
        />
      </DevSection>

      <DevSection
        id="contact-methods"
        title="Contact methods"
        description="options.format: 'contact-methods' renders a repeating add/edit/delete list. Each item's type (phone/email/address/fax/links) determines which fields the edit dialog shows."
      >
        <FormDemoCard
          title="Contact methods"
          constrainWidth={false}
          schema={{
            type: 'object',
            properties: {
              contactMethods: {
                type: 'array',
                title: 'Contact methods',
                items: {
                  type: 'object',
                  required: ['type'],
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['phone', 'email', 'address', 'fax', 'links'],
                    },
                    label: { type: 'string' },
                    value: { type: 'string' },
                    address_one: { type: 'string' },
                    city: { type: 'string' },
                    postal_code: { type: 'string' },
                  },
                },
              },
            },
          }}
          uischema={{
            type: 'VerticalLayout',
            elements: [
              {
                type: 'Control',
                scope: '#/properties/contactMethods',
                label: 'Contact methods',
                options: { format: 'contact-methods' },
              },
            ],
          }}
        />
      </DevSection>

      <DevSection
        id="accessibility"
        title="Accessibility"
        description="How the field wrapper, validation state, and each control type behave for assistive tech — reviewed control by control, not just at the page level."
      >
        <div className="space-y-8">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              Form wrapper &amp; error states
            </h3>
            <A11yRulesSection metadata={getA11yMetadata('form-elements')} />
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Field label/description/error</h3>
            <A11yRulesSection metadata={getA11yMetadata('field')} />
          </div>

          {A11Y_ELEMENT_GROUPS.map((group) => (
            <div key={group.title} className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
              {group.note ? <p className="text-sm text-muted-foreground">{group.note}</p> : null}
              <Accordion multiple>
                {group.components.map((name) => (
                  <AccordionItem key={name} value={name}>
                    <AccordionTrigger>
                      <span className="font-mono text-xs">@repo/ui/{name}</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <A11yRulesSection metadata={getA11yMetadata(name)} />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      </DevSection>
    </DevPageLayout>
  );
}

function FormPreview({ schema, uischema }: { schema: JsonSchema; uischema: UISchemaElement }) {
  const [data, setData] = useState<Record<string, unknown>>({});
  return (
    <JsonForms
      schema={schema}
      uischema={uischema}
      data={data}
      onChange={({ data: d }) => setData(d)}
    />
  );
}

function FormDemoCard({
  title,
  schema,
  uischema,
  constrainWidth = true,
}: {
  title: string;
  schema: JsonSchema;
  uischema: UISchemaElement;
  /** Composite controls like rich text and contact methods need their natural width — capping
   *  them at max-w-sm (right for a plain text/select field) would cramp their own layout. */
  constrainWidth?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      <ExamplePreview code={schemaCode(schema, uischema)}>
        <div className={constrainWidth ? 'max-w-sm' : undefined}>
          <FormPreview schema={schema} uischema={uischema} />
        </div>
      </ExamplePreview>
    </div>
  );
}

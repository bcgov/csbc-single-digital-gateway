import { useState } from 'react';
import { Alert } from '@repo/ui/alert';
import { JsonForms, type JsonSchema, type UISchemaElement } from '@repo/react/jsonforms';
import { CodeBlock } from '@/components/dev/code-block';
import { DevPageLayout } from '@/components/dev/dev-page-layout';
import type { DevNavItem } from '@/components/dev/dev-page-nav';
import { DevSection } from '@/components/dev/dev-section';
import { ExamplePreview } from '@/components/dev/example-preview';

const navItems: DevNavItem[] = [
  { id: 'full-example', text: 'Full example', level: 2 },
  { id: 'usage', text: 'Usage', level: 2 },
  { id: 'text', text: 'Text controls', level: 2 },
  { id: 'selection', text: 'Selection controls', level: 2 },
  { id: 'boolean', text: 'Boolean', level: 2 },
  { id: 'accessibility', text: 'Accessibility', level: 2 },
];

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
          {'JsonForms'} wrapper, which registers them by default.
        </>
      }
      navItems={navItems}
      navLabel="On this page"
      navClassName="sticky top-0 h-screen overflow-y-auto"
    >
      <Alert variant="destructive">This is very much WIP</Alert>

      <DevSection id="full-example" title="Full example">
        <ExamplePreview code={schemaCode(FULL_EXAMPLE_SCHEMA, FULL_EXAMPLE_UISCHEMA)}>
          <FormPreview schema={FULL_EXAMPLE_SCHEMA} uischema={FULL_EXAMPLE_UISCHEMA} />
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
        description="String input and multiline textarea. The tester selects the renderer automatically from the JSON Schema type."
      >
        <div className="space-y-6">
          <FormDemoCard
            title="Text input (string)"
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
            title="Textarea (multiline)"
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
            title="Date input"
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
        </div>
      </DevSection>

      <DevSection
        id="selection"
        title="Selection controls"
        description="Enum dropdown rendered via EnumControl. The enum values in the JSON Schema determine the options list."
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
        </div>
      </DevSection>

      <DevSection
        id="boolean"
        title="Boolean"
        description="Checkbox rendered via BooleanControl. Uses a horizontal FieldWrapper orientation so the label sits beside the input."
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
        </div>
      </DevSection>

      <DevSection id="accessibility" title="Accessibility">
        <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
          <li>
            Labels and descriptions come from the{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">uischema</code>{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">label</code> and{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">schema</code>{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">description</code> — the
            renderers wire these to the input via FieldWrapper, so a missing label means a missing
            accessible name.
          </li>
          <li>
            Always test generated controls with a keyboard and check that validation errors are
            announced, not just shown visually — this hasn't been audited yet (see the WIP notice
            above).
          </li>
        </ul>
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
}: {
  title: string;
  schema: JsonSchema;
  uischema: UISchemaElement;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      <ExamplePreview code={schemaCode(schema, uischema)}>
        <FormPreview schema={schema} uischema={uischema} />
      </ExamplePreview>
    </div>
  );
}

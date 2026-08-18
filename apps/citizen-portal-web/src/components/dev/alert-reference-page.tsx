import {
  mdiAlertOutline,
  mdiCheckCircleOutline,
  mdiClose,
  mdiInformationOutline,
  mdiInformationSlabCircleOutline,
} from '@mdi/js';
import { Icon } from '@mdi/react';
import { Alert, AlertAction, AlertButtons, AlertDescription, AlertTitle } from '@repo/ui/alert';
import { Button } from '@repo/ui/button';
import { CodeBlock } from '@/components/dev/code-block';
import { DevPageLayout } from '@/components/dev/dev-page-layout';
import type { DevNavItem } from '@/components/dev/dev-page-nav';
import { DevSection } from '@/components/dev/dev-section';
import { ExamplePreview } from '@/components/dev/example-preview';
import { extractExample } from '@/components/dev/extract-example';
import { PropTable } from '@/components/dev/prop-table';
import selfSource from './alert-reference-page.tsx?raw';

const navItems: DevNavItem[] = [
  { id: 'full-example', text: 'Full example', level: 2 },
  { id: 'usage', text: 'Usage', level: 2 },
  { id: 'composition', text: 'Composition', level: 2 },
  { id: 'variants', text: 'Variants', level: 2 },
  { id: 'with-action', text: 'With an action', level: 2 },
  { id: 'with-buttons', text: 'With buttons', level: 2 },
  { id: 'roles', text: 'ARIA roles', level: 2 },
  { id: 'accessibility', text: 'Accessibility', level: 2 },
  { id: 'api-reference', text: 'API reference', level: 2 },
];

/** Sole source of truth for the "Full example"/"Variants" sweep — drives both the rendered
 *  stack (FullExampleStack) and its generated "Show code" string (FULL_EXAMPLE_CODE). `iconName`
 *  is kept alongside the resolved `icon` path purely so the generated code prints the identifier
 *  a reader would actually import, not the resolved (illegible) SVG path data. */
const ALERT_VARIANTS = [
  {
    variant: 'info',
    icon: mdiInformationSlabCircleOutline,
    iconName: 'mdiInformationSlabCircleOutline',
    title: 'Your application was saved',
    description: 'You can come back and finish it any time before it expires.',
  },
  {
    variant: 'success',
    icon: mdiCheckCircleOutline,
    iconName: 'mdiCheckCircleOutline',
    title: 'Application submitted',
    description: "We've received your application and will be in touch if we need anything else.",
  },
  {
    variant: 'warning',
    icon: mdiAlertOutline,
    iconName: 'mdiAlertOutline',
    title: 'Missing information',
    description: 'Add a phone number so we can reach you if we need to follow up.',
  },
  {
    variant: 'danger',
    icon: mdiInformationOutline,
    iconName: 'mdiInformationOutline',
    title: "We couldn't save your changes",
    description: 'Check your connection and try again.',
  },
] as const;

function FullExampleStack() {
  return (
    <div className="space-y-3">
      {ALERT_VARIANTS.map((v) => (
        <Alert key={v.variant} variant={v.variant}>
          <Icon path={v.icon} aria-hidden={true} />
          <AlertTitle>{v.title}</AlertTitle>
          <AlertDescription>{v.description}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}

const FULL_EXAMPLE_CODE = ALERT_VARIANTS.map(
  (v) => `<Alert variant="${v.variant}">
  <Icon path={${v.iconName}} aria-hidden={true} />
  <AlertTitle>${v.title}</AlertTitle>
  <AlertDescription>${v.description}</AlertDescription>
</Alert>`,
).join('\n\n');

const VARIANTS_CODE = FULL_EXAMPLE_CODE;

const USAGE_IMPORT_CODE = `import { Alert, AlertTitle, AlertDescription } from "@repo/ui/alert";`;

const USAGE_SKELETON_CODE = `<Alert variant="info">
  <AlertTitle>Title</AlertTitle>
  <AlertDescription>Description</AlertDescription>
</Alert>`;

const COMPOSITION_TREE = `Alert
├── AlertTitle
├── AlertDescription
├── AlertAction (optional)
└── AlertButtons (optional)`;

// #region with-action
function WithActionExample() {
  return (
    <Alert variant="info">
      <Icon path={mdiInformationSlabCircleOutline} aria-hidden={true} />
      <AlertTitle>New version available</AlertTitle>
      <AlertDescription>Refresh the page to pick up the latest changes.</AlertDescription>
      <AlertAction>
        <Button variant="ghost" size="icon" aria-label="Dismiss">
          <Icon path={mdiClose} size="16px" aria-hidden={true} />
        </Button>
      </AlertAction>
    </Alert>
  );
}
// #endregion with-action

// #region with-buttons
function WithButtonsExample() {
  return (
    <Alert variant="info">
      <Icon path={mdiInformationSlabCircleOutline} aria-hidden={true} />
      <AlertTitle>New version available</AlertTitle>
      <AlertDescription>Refresh the page to pick up the latest changes.</AlertDescription>
      <AlertButtons>
        <Button variant="ghost">Not now</Button>
        <Button variant="outline">Refresh</Button>
      </AlertButtons>
    </Alert>
  );
}
// #endregion with-buttons

export function AlertReferencePage() {
  return (
    <DevPageLayout
      title="Alert - Inline"
      description="An inline, non-blocking message — a status update or warning that lives in the page's own layout, not a toast or a dialog."
      navItems={navItems}
      navLabel="On this page"
      navClassName="sticky top-0 h-screen overflow-y-auto"
    >
      <DevSection id="full-example" title="Full example">
        <ExamplePreview code={FULL_EXAMPLE_CODE}>
          <FullExampleStack />
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
        description="An icon as Alert's first child is optional but common — the component's grid layout accounts for it automatically. AlertAction is optional and positions itself in the top-right corner."
      >
        <CodeBlock code={COMPOSITION_TREE} />
      </DevSection>

      <DevSection
        id="variants"
        title="Variants"
        description="info (default), success, warning, and danger — each tints the icon, border, and background; body text stays neutral for readability."
      >
        <ExamplePreview code={VARIANTS_CODE}>
          <FullExampleStack />
        </ExamplePreview>
      </DevSection>

      <DevSection
        id="with-action"
        title="With an action"
        description="AlertAction absolutely positions itself in the top-right — pair it with an icon-only Button (e.g. dismiss)."
      >
        <ExamplePreview code={extractExample(selfSource, 'with-action')}>
          <WithActionExample />
        </ExamplePreview>
      </DevSection>

      <DevSection
        id="with-buttons"
        title="With buttons"
        description="For more than one action, skip AlertAction and use AlertButtons instead — it right-aligns the row and keeps it under the title/description when Alert has an icon."
      >
        <ExamplePreview code={extractExample(selfSource, 'with-buttons')}>
          <WithButtonsExample />
        </ExamplePreview>
      </DevSection>

      <DevSection
        id="roles"
        title="ARIA roles"
        description={
          <>
            By default, an inline alert renders with the ARIA{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">note</code> role.
          </>
        }
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Use the <code className="text-xs bg-muted px-1.5 py-0.5 rounded">role</code> prop to set
            a different role. You can pass any valid ARIA role, but these are the recommended
            options:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">complementary</code>
            </li>
            <li>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">status</code>
            </li>
            <li>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">alert</code>
            </li>
          </ul>
          <p>
            Note: the <code className="text-xs bg-muted px-1.5 py-0.5 rounded">alert</code> role
            should be used with caution, and only when the alert requires the user's immediate
            attention.
          </p>
        </div>
      </DevSection>

      <DevSection id="accessibility" title="Accessibility">
        <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
          <li>
            Alert renders with{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">role="note"</code> by default —
            see "ARIA roles" above for when to override it, and don't use Alert at all for messages
            that aren't important enough to warrant any of these roles (that's what plain text is
            for).
          </li>
          <li>
            Icons are decorative (the title/description already carry the meaning) — always add{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{'aria-hidden={true}'}</code>.
          </li>
          <li>
            Body text stays a neutral color across all variants by design — color alone (icon,
            border, background) never carries the only signal, so don't rely on it either when
            writing the title/description copy.
          </li>
          <li>
            An icon-only <code className="text-xs bg-muted px-1.5 py-0.5 rounded">AlertAction</code>{' '}
            button (e.g. dismiss) needs its own{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">aria-label</code> — there's no
            visible text for assistive tech to read.
          </li>
        </ul>
      </DevSection>

      <DevSection id="api-reference" title="API reference">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium">Alert</p>
            <PropTable
              rows={[
                ['variant', '"info" | "success" | "warning" | "danger"', '"info"', '—'],
                [
                  'role',
                  'AriaRole',
                  '"note"',
                  'Recommended overrides: "complementary", "status", "alert" (use "alert" sparingly).',
                ],
              ]}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">
              AlertTitle / AlertDescription / AlertAction / AlertButtons
            </p>
            <PropTable
              rows={[
                [
                  'className',
                  'string',
                  '—',
                  'All four forward the rest of their props to a plain div.',
                ],
              ]}
            />
          </div>
        </div>
      </DevSection>
    </DevPageLayout>
  );
}

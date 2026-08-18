import {
  mdiArrowRight,
  mdiFormatBold,
  mdiFormatItalic,
  mdiFormatUnderline,
  mdiOpenInNew,
  mdiPlay,
  mdiPlus,
} from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button, buttonVariants } from '@repo/ui/button';
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from '@repo/ui/button-group';
import { Link } from '@tanstack/react-router';
import { getA11yMetadata } from '@/a11y/a11y-catalog';
import { A11yRulesSection } from '@/components/dev/a11y-rules-section';
import { CodeBlock } from '@/components/dev/code-block';
import { DevPageLayout } from '@/components/dev/dev-page-layout';
import type { DevNavItem } from '@/components/dev/dev-page-nav';
import { DevSection } from '@/components/dev/dev-section';
import { ExamplePreview } from '@/components/dev/example-preview';
import { extractExample } from '@/components/dev/extract-example';
import { PropTable } from '@/components/dev/prop-table';
import selfSource from './button-reference-page.tsx?raw';

const navItems: DevNavItem[] = [
  { id: 'full-example', text: 'Full example', level: 2 },
  { id: 'usage', text: 'Usage', level: 2 },
  { id: 'composition', text: 'Composition', level: 2 },
  { id: 'links', text: 'Buttons as links', level: 2 },
  { id: 'sizes', text: 'Sizes', level: 2 },
  { id: 'variants', text: 'Variants', level: 2 },
  { id: 'disabled', text: 'Disabled', level: 2 },
  { id: 'icons', text: 'Icons', level: 2 },
  { id: 'button-group', text: 'Button group', level: 2 },
  { id: 'accessibility', text: 'Accessibility', level: 2 },
  { id: 'api-reference', text: 'API reference', level: 2 },
];

const VARIANTS = [
  { variant: 'default', label: 'Default' },
  { variant: 'outline', label: 'Outline' },
  { variant: 'ghost', label: 'Ghost' },
  { variant: 'destructive', label: 'Destructive' },
  { variant: 'link', label: 'Link' },
] as const;

const SIZES = [
  { size: 'xs', label: 'XS' },
  { size: 'sm', label: 'Small' },
  { size: 'default', label: 'Medium' },
  { size: 'lg', label: 'Large' },
] as const;

function variantCode(v: (typeof VARIANTS)[number], disabled = false): string {
  const attrs = [
    disabled ? 'disabled' : null,
    v.variant === 'default' ? null : `variant="${v.variant}"`,
  ]
    .filter(Boolean)
    .join(' ');
  return attrs ? `<Button ${attrs}>${v.label}</Button>` : `<Button>${v.label}</Button>`;
}

/** Shared by "Full example" and "Variants" — same sweep, different framing. */
function VariantSweepExample() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {VARIANTS.map((v) => (
        <Button key={v.variant} variant={v.variant}>
          {v.label}
        </Button>
      ))}
    </div>
  );
}

const FULL_EXAMPLE_CODE = VARIANTS.map((v) => variantCode(v)).join('\n');

const USAGE_IMPORT_CODE = `import { Button, buttonVariants } from "@repo/ui/button";`;

const USAGE_SKELETON_CODE = `<Button>Button</Button>`;

function LinksExample() {
  return (
    <div className="flex flex-wrap gap-3">
      {/* #region links */}
      <Link to="/services" className={buttonVariants({ variant: 'default', size: 'default' })}>
        <Icon path={mdiPlay} size="16px" />
        Internal button
      </Link>
      <a
        href="https://www2.gov.bc.ca"
        className={buttonVariants({ variant: 'default', size: 'default' })}
      >
        External button
        <Icon path={mdiOpenInNew} size="16px" />
      </a>
      {/* #endregion links */}
    </div>
  );
}

function SizesExample() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {SIZES.map((s) => (
        <Button key={s.size} size={s.size}>
          {s.label}
        </Button>
      ))}
    </div>
  );
}

const SIZES_CODE = SIZES.map((s) => `<Button size="${s.size}">${s.label}</Button>`).join('\n');

function DisabledExample() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {VARIANTS.map((v) => (
        <Button key={v.variant} disabled variant={v.variant}>
          {v.label}
        </Button>
      ))}
    </div>
  );
}

const DISABLED_CODE = VARIANTS.map((v) => variantCode(v, true)).join('\n');

const BUTTON_GROUP_DESCRIPTION = `In shadcn, ButtonGroup is a separate component family (ButtonGroup, ButtonGroupText, ButtonGroupSeparator) with an orientation prop and a segmented, adjoining button look. The BC Design System defines a simpler ButtonGroup — a semantic grouping only, orientation, alignment, and a required aria-label, rendered as a div with role="group", buttons keeping their normal styling and spacing. This is shadcn's ButtonGroup, extended with an alignment prop and a variant prop — variant="default" gives BCDS's plain grouping (the default here), variant="joined" opts back into shadcn's segmented look.`;

function IconsExample() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {/* #region icons */}
      <Button>
        <Icon path={mdiPlus} size="16px" />
        Add item
      </Button>
      <Button variant="outline">
        Next step
        <Icon path={mdiArrowRight} size="16px" />
      </Button>
      <Button aria-label="Play" variant="ghost" size="icon">
        <Icon path={mdiPlay} size="16px" />
      </Button>
      <Button aria-label="Open external link" size="icon-sm">
        <Icon path={mdiOpenInNew} size="16px" />
      </Button>
      {/* #endregion icons */}
    </div>
  );
}

// #region button-group
function ButtonGroupExample() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <p className="text-sm font-medium">Default — normal button styling and spacing (BCDS)</p>
        <ButtonGroup aria-label="Pagination" alignment="center" className="w-full">
          <Button variant="ghost">Previous</Button>
          <Button variant="outline">Next</Button>
        </ButtonGroup>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Joined — shadcn's segmented look (opt-in)</p>
        <ButtonGroup aria-label="Text formatting" variant="joined">
          <Button variant="outline" size="icon" aria-label="Bold">
            <Icon path={mdiFormatBold} size="16px" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Italic">
            <Icon path={mdiFormatItalic} size="16px" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Underline">
            <Icon path={mdiFormatUnderline} size="16px" />
          </Button>
          <ButtonGroupSeparator />
          <ButtonGroupText>12pt</ButtonGroupText>
        </ButtonGroup>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Vertical orientation</p>
        <ButtonGroup aria-label="Row actions" orientation="vertical" className="w-40">
          <Button>Edit</Button>
          <Button variant="outline">Duplicate</Button>
          <Button variant="destructive">Delete</Button>
        </ButtonGroup>
      </div>
    </div>
  );
}
// #endregion button-group

export function ButtonReferencePage() {
  return (
    <DevPageLayout
      title="Button"
      description="Displays a button, or an element styled as one."
      navItems={navItems}
      navLabel="On this page"
      navClassName="sticky top-0 h-screen overflow-y-auto"
    >
      <DevSection id="full-example" title="Full example">
        <ExamplePreview code={FULL_EXAMPLE_CODE}>
          <VariantSweepExample />
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

      <DevSection id="composition" title="Composition">
        <p className="text-sm text-muted-foreground">
          Button has no subcomponents — render it directly for real buttons.{' '}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">buttonVariants()</code> is the
          class-generating function Button is built on; use it directly only when styling a
          non-Button element (
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{'<Link>'}</code>,{' '}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{'<a>'}</code>) as a button — see{' '}
          <a href="#links" className="text-link hover:underline">
            Buttons as links
          </a>{' '}
          below.
        </p>
      </DevSection>

      <DevSection
        id="links"
        title="Buttons as links"
        description="buttonVariants is only for link elements styled as buttons — internal navigation uses Link, external navigation uses a normal anchor."
      >
        <ExamplePreview code={extractExample(selfSource, 'links')}>
          <LinksExample />
        </ExamplePreview>
      </DevSection>

      <DevSection id="sizes" title="Sizes">
        <ExamplePreview code={SIZES_CODE}>
          <SizesExample />
        </ExamplePreview>
      </DevSection>

      <DevSection id="variants" title="Variants">
        <ExamplePreview code={FULL_EXAMPLE_CODE}>
          <VariantSweepExample />
        </ExamplePreview>
      </DevSection>

      <DevSection id="disabled" title="Disabled">
        <ExamplePreview code={DISABLED_CODE}>
          <DisabledExample />
        </ExamplePreview>
      </DevSection>

      <DevSection id="icons" title="Icons: left, right, icon-only">
        <ExamplePreview code={extractExample(selfSource, 'icons')}>
          <IconsExample />
        </ExamplePreview>
      </DevSection>

      <DevSection id="button-group" title="Button group" description={BUTTON_GROUP_DESCRIPTION}>
        <ExamplePreview code={extractExample(selfSource, 'button-group')}>
          <ButtonGroupExample />
        </ExamplePreview>
      </DevSection>

      <DevSection id="accessibility" title="Accessibility">
        <A11yRulesSection metadata={getA11yMetadata('button')} />
      </DevSection>

      <DevSection id="api-reference" title="API reference">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium">Button</p>
            <PropTable
              rows={[
                [
                  'variant',
                  '"default" | "outline" | "ghost" | "destructive" | "link"',
                  '"default"',
                  'Visual style.',
                ],
                [
                  'size',
                  '"xs" | "sm" | "default" | "lg" | "icon-xs" | "icon-sm" | "icon" | "icon-lg"',
                  '"default"',
                  'The icon-* sizes are square, icon-only buttons.',
                ],
                [
                  'render',
                  'ReactElement',
                  '—',
                  "Renders Button as a different element (e.g. a Link) while keeping Button's behaviour. For styling a Link/anchor as a button without Button's behaviour, use buttonVariants() directly instead.",
                ],
              ]}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">ButtonGroup</p>
            <PropTable
              rows={[
                [
                  'variant',
                  '"default" | "joined"',
                  '"default"',
                  '"default" is the BCDS look — buttons keep their normal styling and spacing. "joined" is shadcn\'s adjoining, segmented-control look with shared borders and only the outer corners rounded.',
                ],
                [
                  'orientation',
                  '"horizontal" | "vertical"',
                  '"horizontal"',
                  'Layout direction of the grouped buttons.',
                ],
                [
                  'alignment',
                  '"start" | "center" | "end"',
                  '"start"',
                  'Justifies the buttons within the group\'s box — only visible once the group is wider than its content (e.g. via className="w-full").',
                ],
                [
                  'aria-label',
                  'string',
                  '—',
                  'Required — role="group" has no accessible name without one.',
                ],
              ]}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">ButtonGroupText / ButtonGroupSeparator</p>
            <PropTable
              rows={[
                [
                  'ButtonGroupText',
                  'React.ComponentProps<"div">',
                  '—',
                  'Non-interactive label slot inside a group, e.g. a unit or status.',
                ],
                [
                  'ButtonGroupSeparator',
                  'React.ComponentProps<typeof Separator>',
                  '—',
                  'Visual divider between subsets of a group.',
                ],
              ]}
            />
          </div>
        </div>
      </DevSection>
    </DevPageLayout>
  );
}

import { mdiArrowRight, mdiOpenInNew, mdiPlay, mdiPlus } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button, buttonVariants } from '@repo/ui/button';
import { Link } from '@tanstack/react-router';
import { getA11yMetadata } from '@/a11y/a11y-catalog';
import { A11yRulesSection } from '@/components/dev/a11y-rules-section';
import { CodeBlock } from '@/components/dev/code-block';
import { DevPageLayout } from '@/components/dev/dev-page-layout';
import type { DevNavItem } from '@/components/dev/dev-page-nav';
import { DevSection } from '@/components/dev/dev-section';
import { ExamplePreview } from '@/components/dev/example-preview';
import { PropTable } from '@/components/dev/prop-table';

const navItems: DevNavItem[] = [
  { id: 'full-example', text: 'Full example', level: 2 },
  { id: 'usage', text: 'Usage', level: 2 },
  { id: 'composition', text: 'Composition', level: 2 },
  { id: 'links', text: 'Buttons as links', level: 2 },
  { id: 'sizes', text: 'Sizes', level: 2 },
  { id: 'variants', text: 'Variants', level: 2 },
  { id: 'disabled', text: 'Disabled', level: 2 },
  { id: 'icons', text: 'Icons', level: 2 },
  { id: 'accessibility', text: 'Accessibility', level: 2 },
  { id: 'api-reference', text: 'API reference', level: 2 },
];

const FULL_EXAMPLE_CODE = `<Button>Default</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="link">Link</Button>`;

const USAGE_IMPORT_CODE = `import { Button, buttonVariants } from "@repo/ui/button";`;

const USAGE_SKELETON_CODE = `<Button>Button</Button>`;

const LINKS_CODE = `<Link
  to="/services"
  className={buttonVariants({ variant: "default", size: "default" })}
>
  <Icon path={mdiPlay} size="16px" />
  Internal button
</Link>

<a
  href="https://www2.gov.bc.ca"
  className={buttonVariants({ variant: "default", size: "default" })}
>
  External button
  <Icon path={mdiOpenInNew} size="16px" />
</a>`;

const SIZES_CODE = `<Button size="xs">XS</Button>
<Button size="sm">Small</Button>
<Button size="default">Medium</Button>
<Button size="lg">Large</Button>`;

const VARIANTS_CODE = `<Button>Default</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="link">Link</Button>`;

const DISABLED_CODE = `<Button disabled>Default</Button>
<Button disabled variant="outline">Outline</Button>
<Button disabled variant="ghost">Ghost</Button>
<Button disabled variant="destructive">Destructive</Button>
<Button disabled variant="link">Link</Button>`;

const ICONS_CODE = `<Button>
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
</Button>`;

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
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
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
        <ExamplePreview code={LINKS_CODE}>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/services"
              className={buttonVariants({ variant: 'default', size: 'default' })}
            >
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
          </div>
        </ExamplePreview>
      </DevSection>

      <DevSection id="sizes" title="Sizes">
        <ExamplePreview code={SIZES_CODE}>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="xs">XS</Button>
            <Button size="sm">Small</Button>
            <Button size="default">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
        </ExamplePreview>
      </DevSection>

      <DevSection id="variants" title="Variants">
        <ExamplePreview code={VARIANTS_CODE}>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
        </ExamplePreview>
      </DevSection>

      <DevSection id="disabled" title="Disabled">
        <ExamplePreview code={DISABLED_CODE}>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button disabled>Default</Button>
            <Button disabled variant="outline">
              Outline
            </Button>
            <Button disabled variant="ghost">
              Ghost
            </Button>
            <Button disabled variant="destructive">
              Destructive
            </Button>
            <Button disabled variant="link">
              Link
            </Button>
          </div>
        </ExamplePreview>
      </DevSection>

      <DevSection id="icons" title="Icons: left, right, icon-only">
        <ExamplePreview code={ICONS_CODE}>
          <div className="flex flex-wrap items-center justify-center gap-3">
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
          </div>
        </ExamplePreview>
      </DevSection>

      <DevSection id="accessibility" title="Accessibility">
        <A11yRulesSection metadata={getA11yMetadata('button')} />
      </DevSection>

      <DevSection id="api-reference" title="API reference">
        <div className="space-y-2">
          <p className="text-sm font-medium">Button</p>
          <PropTable
            rows={[
              [
                'variant',
                '"default" | "secondary" | "outline" | "ghost" | "destructive" | "link"',
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
      </DevSection>
    </DevPageLayout>
  );
}

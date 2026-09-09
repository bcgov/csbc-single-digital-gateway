import { CodeBlock } from '@/components/dev/code-block';
import { DevPageLayout } from '@/components/dev/dev-page-layout';
import type { DevNavItem } from '@/components/dev/dev-page-nav';
import { DevSection } from '@/components/dev/dev-section';
import { ExamplePreview } from '@/components/dev/example-preview';
import { extractExample } from '@/components/dev/extract-example';
import { PropTable } from '@/components/dev/prop-table';
import { PageContent } from '@/components/layout/page-content';
import selfSource from './page-content-reference-page.tsx?raw';

const navItems: DevNavItem[] = [
  { id: 'full-example', text: 'Full example', level: 2 },
  { id: 'usage', text: 'Usage', level: 2 },
  { id: 'composition', text: 'Composition', level: 2 },
  { id: 'gap', text: 'Gap', level: 2 },
  { id: 'api-reference', text: 'API reference', level: 2 },
];

const USAGE_IMPORT_CODE = `import { PageContent } from '@/components/layout/page-content';`;

const USAGE_SKELETON_CODE = `<CitizenShell>\n  <PageContent>{/* page content */}</PageContent>\n</CitizenShell>`;

function PreviewBlock({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

// #region full-example
function FullExample() {
  return (
    <PageContent>
      <PreviewBlock label="Section one" />
      <PreviewBlock label="Section two" />
      <PreviewBlock label="Section three" />
    </PageContent>
  );
}
// #endregion full-example

// #region gap
function GapExample() {
  return (
    <div className="flex flex-col gap-6">
      <PageContent gap={9}>
        <PreviewBlock label="gap = 9 (default)" />
        <PreviewBlock label="gap = 9 (default)" />
      </PageContent>
      <PageContent gap={6}>
        <PreviewBlock label="gap = 6" />
        <PreviewBlock label="gap = 6" />
      </PageContent>
      <PageContent gap={3}>
        <PreviewBlock label="gap = 3 — loading/skeleton stacks" />
        <PreviewBlock label="gap = 3 — loading/skeleton stacks" />
      </PageContent>
      <PageContent gap={0}>
        <PreviewBlock label="gap = 0 — a single centered block, e.g. a login prompt" />
      </PageContent>
    </div>
  );
}
// #endregion gap

export function PageContentReferencePage() {
  return (
    <DevPageLayout
      title="Page content"
      description="citizen-portal-web's standard page-body column: centered, width-constrained, padded."
      navItems={navItems}
      navLabel="On this page"
      navClassName="sticky top-0 h-screen overflow-y-auto"
    >
      <DevSection id="full-example" title="Full example">
        <ExamplePreview code={extractExample(selfSource, 'full-example')}>
          <FullExample />
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
          Every citizen-portal-web page under <code>apps/citizen-portal-web</code> should render its
          main content through <code>PageContent</code> instead of hand-rolling the same content-
          column Tailwind string. It has no subcomponents — render it directly as the immediate
          child of the page's shell (<code>PageShell</code> / <code>CitizenShell</code>), with any
          header (<code>PageHeaderBanner</code> / <code>SettingsPageHeader</code>) as a sibling
          above it, not nested inside it.
        </p>
      </DevSection>

      <DevSection
        id="gap"
        title="Gap"
        description="Vertical gap between stacked children. 9 (default) is the common case for a page's main content; 3/6 suit tighter stacks (e.g. a loading skeleton); 0 wraps a single block with no siblings to space out."
      >
        <ExamplePreview code={extractExample(selfSource, 'gap')}>
          <GapExample />
        </ExamplePreview>
      </DevSection>

      <DevSection id="api-reference" title="API reference">
        <PropTable
          rows={[
            ['children', 'ReactNode', '—', 'The page content.'],
            ['gap', '0 | 3 | 6 | 9', '9', 'Vertical gap between stacked children.'],
            ['className', 'string', '—', 'Additional classes appended to the column.'],
          ]}
        />
      </DevSection>
    </DevPageLayout>
  );
}

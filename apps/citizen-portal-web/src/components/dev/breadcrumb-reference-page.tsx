import { getA11yMetadata } from '@/a11y/a11y-catalog';
import { A11yRulesSection } from '@/components/dev/a11y-rules-section';
import { Breadcrumb } from '@/components/breadcrumb';
import { CodeBlock } from '@/components/dev/code-block';
import { DevPageLayout } from '@/components/dev/dev-page-layout';
import type { DevNavItem } from '@/components/dev/dev-page-nav';
import { DevSection } from '@/components/dev/dev-section';
import { ExamplePreview } from '@/components/dev/example-preview';
import { extractExample } from '@/components/dev/extract-example';
import { PropTable } from '@/components/dev/prop-table';
import selfSource from './breadcrumb-reference-page.tsx?raw';

const navItems: DevNavItem[] = [
  { id: 'full-example', text: 'Full example', level: 2 },
  { id: 'usage', text: 'Usage', level: 2 },
  { id: 'composition', text: 'Composition', level: 2 },
  { id: 'current-page', text: 'Current page', level: 2 },
  { id: 'accessibility', text: 'Accessibility', level: 2 },
  { id: 'api-reference', text: 'API reference', level: 2 },
];

const USAGE_IMPORT_CODE = `import { Breadcrumb } from "@/components/breadcrumb";`;

const USAGE_SKELETON_CODE = `<Breadcrumb trail={[{ label: "Services", href: "/services" }, { label: "Business licence" }]} />`;

// #region full-example
function FullExampleBreadcrumb() {
  return (
    <Breadcrumb
      trail={[
        { label: 'Home', href: '/' },
        { label: 'Service agreements', href: '/service-agreements' },
        { label: 'Business licence renewal' },
      ]}
    />
  );
}
// #endregion full-example

export function BreadcrumbReferencePage() {
  return (
    <DevPageLayout
      title="Breadcrumb"
      description="A simple breadcrumb trail. Each crumb but the last is a client-side router link; the last renders as the current page."
      navItems={navItems}
      navLabel="On this page"
      navClassName="sticky top-0 h-screen overflow-y-auto"
    >
      <DevSection id="full-example" title="Full example">
        <ExamplePreview code={extractExample(selfSource, 'full-example')}>
          <FullExampleBreadcrumb />
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
          Breadcrumb has no subcomponents — pass the whole trail as a single{' '}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">trail</code> array. Every crumb
          but the last needs an <code className="text-xs bg-muted px-1.5 py-0.5 rounded">href</code>
          ; omitting it marks that crumb as the current page.
        </p>
      </DevSection>

      <DevSection
        id="current-page"
        title="Current page"
        description="Already visible in the full example above: the last crumb (Business licence renewal) has no href, so it renders as bold text with aria-current=&quot;page&quot; instead of a link — only one nav landmark is kept live on this page to avoid duplicate 'Breadcrumb' landmarks."
      >
        <CodeBlock
          code={`{ label: "Business licence renewal" } // no href → current page`}
          label="current page crumb"
        />
      </DevSection>

      <DevSection id="accessibility" title="Accessibility">
        <A11yRulesSection metadata={getA11yMetadata('breadcrumb')} />
      </DevSection>

      <DevSection id="api-reference" title="API reference">
        <div className="space-y-2">
          <p className="text-sm font-medium">Breadcrumb</p>
          <PropTable
            rows={[
              [
                'trail',
                '{ label: string; href?: string }[]',
                '—',
                'Required. The last entry with no href renders as the current page.',
              ],
            ]}
          />
        </div>
      </DevSection>
    </DevPageLayout>
  );
}

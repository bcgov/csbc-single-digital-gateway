import {
  mdiAccountCog,
  mdiAlertCircle,
  mdiArrowRight,
  mdiCake,
  mdiCheckCircle,
  mdiChevronRight,
  mdiContentCopy,
  mdiLogin,
  mdiMagnify,
  mdiMenu,
  mdiOpenInNew,
  mdiPlus,
  mdiSend,
} from '@mdi/js';
import { Icon } from '@mdi/react';
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
  { id: 'sizes', text: 'Sizes', level: 2 },
  { id: 'colors', text: 'Colors', level: 2 },
  { id: 'samples', text: 'Sample icons', level: 2 },
  { id: 'accessibility', text: 'Accessibility', level: 2 },
  { id: 'api-reference', text: 'API reference', level: 2 },
  { id: 'browse-all', text: 'Browse all icons', level: 2 },
];

const SAMPLE_ICONS = [
  { path: mdiCake, name: 'mdiCake' },
  { path: mdiChevronRight, name: 'mdiChevronRight' },
  { path: mdiArrowRight, name: 'mdiArrowRight' },
  { path: mdiPlus, name: 'mdiPlus' },
  { path: mdiMagnify, name: 'mdiMagnify' },
  { path: mdiContentCopy, name: 'mdiContentCopy' },
  { path: mdiCheckCircle, name: 'mdiCheckCircle' },
  { path: mdiAlertCircle, name: 'mdiAlertCircle' },
  { path: mdiLogin, name: 'mdiLogin' },
  { path: mdiSend, name: 'mdiSend' },
  { path: mdiAccountCog, name: 'mdiAccountCog' },
  { path: mdiOpenInNew, name: 'mdiOpenInNew' },
  { path: mdiMenu, name: 'mdiMenu' },
] as const;

const FULL_EXAMPLE_CODE = `<Icon path={mdiCake} size="24px" className="text-blue-80" aria-hidden={true} />
<Icon path={mdiCheckCircle} size="24px" className="text-success-border" aria-hidden={true} />
<Icon path={mdiAlertCircle} size="24px" className="text-danger-border" aria-hidden={true} />
<Icon path={mdiSend} size="24px" aria-hidden={true} />`;

const USAGE_IMPORT_CODE = `import { mdiCake } from "@mdi/js";
import { Icon } from "@mdi/react";`;

const USAGE_SKELETON_CODE = `<Icon path={mdiCake} size="24px" aria-hidden={true} />`;

const SIZES_CODE = `<Icon path={mdiCake} size="16px" aria-hidden={true} />
<Icon path={mdiCake} size="20px" aria-hidden={true} />
<Icon path={mdiCake} size="24px" aria-hidden={true} />
<Icon path={mdiCake} size="32px" aria-hidden={true} />`;

const COLORS_CODE = `<Icon path={mdiCake} size="24px" aria-hidden={true} />
<Icon path={mdiCake} size="24px" className="text-link" aria-hidden={true} />
<Icon path={mdiCake} size="24px" className="text-blue-80" aria-hidden={true} />
<Icon path={mdiCake} size="24px" className="text-muted-foreground" aria-hidden={true} />
<Icon path={mdiCake} size="24px" className="text-danger-border" aria-hidden={true} />`;

export function IconReferencePage() {
  return (
    <DevPageLayout
      title="Icons"
      description="Material Design Icons (MDI) — @mdi/js exports the path data, @mdi/react renders it."
      navItems={navItems}
      navLabel="On this page"
      navClassName="sticky top-0 h-screen overflow-y-auto"
    >
      <DevSection id="full-example" title="Full example">
        <ExamplePreview code={FULL_EXAMPLE_CODE}>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Icon path={mdiCake} size="24px" className="text-blue-80" aria-hidden={true} />
            <Icon
              path={mdiCheckCircle}
              size="24px"
              className="text-success-border"
              aria-hidden={true}
            />
            <Icon
              path={mdiAlertCircle}
              size="24px"
              className="text-danger-border"
              aria-hidden={true}
            />
            <Icon path={mdiSend} size="24px" aria-hidden={true} />
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
          Two packages work together:{' '}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">@mdi/js</code> exports every icon
          as a raw SVG path string, named{' '}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">mdi</code>-prefixed camelCase
          (e.g. <code className="text-xs bg-muted px-1.5 py-0.5 rounded">mdiCake</code>).{' '}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">@mdi/react</code>'s{' '}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">Icon</code> component renders
          that path as an SVG. There's no separate icon component per-icon — one{' '}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">Icon</code> renders whichever
          path you pass it.
        </p>
      </DevSection>

      <DevSection id="sizes" title="Sizes">
        <ExamplePreview code={SIZES_CODE}>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Icon path={mdiCake} size="16px" aria-hidden={true} />
            <Icon path={mdiCake} size="20px" aria-hidden={true} />
            <Icon path={mdiCake} size="24px" aria-hidden={true} />
            <Icon path={mdiCake} size="32px" aria-hidden={true} />
          </div>
        </ExamplePreview>
      </DevSection>

      <DevSection
        id="colors"
        title="Colors"
        description="Icon has no color prop of its own here — pass a text-* className and the SVG inherits it via currentColor."
      >
        <ExamplePreview code={COLORS_CODE}>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Icon path={mdiCake} size="24px" aria-hidden={true} />
            <Icon path={mdiCake} size="24px" className="text-link" aria-hidden={true} />
            <Icon path={mdiCake} size="24px" className="text-blue-80" aria-hidden={true} />
            <Icon path={mdiCake} size="24px" className="text-muted-foreground" aria-hidden={true} />
            <Icon path={mdiCake} size="24px" className="text-danger-border" aria-hidden={true} />
          </div>
        </ExamplePreview>
      </DevSection>

      <DevSection
        id="samples"
        title="Sample icons"
        description="A few of the icons already used across the app — not the full MDI set, see Browse all icons below."
      >
        <div className="grid grid-cols-4 gap-4 sm:grid-cols-6">
          {SAMPLE_ICONS.map((icon) => (
            <div
              key={icon.name}
              className="flex flex-col items-center gap-2 rounded-md border border-border p-3 text-center"
            >
              <Icon path={icon.path} size="24px" aria-hidden={true} />
              <code className="text-[0.625rem] text-muted-foreground break-all">{icon.name}</code>
            </div>
          ))}
        </div>
      </DevSection>

      <DevSection id="accessibility" title="Accessibility">
        <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
          <li>
            Decorative icons (an icon next to text that already conveys the meaning) always need{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{'aria-hidden={true}'}</code>.
          </li>
          <li>
            An icon-only control (no visible text) needs an{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">aria-label</code> on the
            interactive element it sits inside (a button or link) — not on the icon itself.
          </li>
          <li>
            Icon has its own <code className="text-xs bg-muted px-1.5 py-0.5 rounded">title</code>/
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">description</code> props for a
            genuinely standalone, meaningful icon (rare here) — prefer{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">aria-label</code> on the
            surrounding control instead where one exists.
          </li>
        </ul>
      </DevSection>

      <DevSection id="api-reference" title="API reference">
        <div className="space-y-2">
          <p className="text-sm font-medium">Icon (@mdi/react)</p>
          <PropTable
            rows={[
              ['path', 'string', '—', 'Required. The mdi* path constant from @mdi/js.'],
              ['size', 'number | string', '24', 'e.g. "24px" or a number of px.'],
              ['color', 'string', '—', 'Prefer a text-* className (currentColor) instead.'],
              ['rotate', 'number', '0', 'Degrees.'],
              [
                'spin',
                'boolean | number',
                'false',
                'true = 2s per rotation, or seconds per rotation.',
              ],
              ['title / description', 'string', '—', 'Rarely needed — see Accessibility above.'],
            ]}
          />
        </div>
      </DevSection>

      <DevSection
        id="browse-all"
        title="Browse all icons"
        description="This page only samples a handful. Every icon in @mdi/js is browsable here:"
      >
        <a
          href="https://pictogrammers.com/library/mdi/"
          target="_blank"
          rel="noreferrer"
          className="text-link hover:underline"
        >
          pictogrammers.com/library/mdi
        </a>
        <p className="mt-2 text-sm text-muted-foreground">
          Names on that site are kebab-case (e.g.{' '}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">account-cog</code>) — drop the
          hyphens, capitalize each word, and prefix with{' '}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">mdi</code> to get the{' '}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">@mdi/js</code> export name (
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">mdiAccountCog</code>).
        </p>
      </DevSection>
    </DevPageLayout>
  );
}

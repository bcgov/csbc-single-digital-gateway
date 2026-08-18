import { mdiAlertCircle, mdiCheckCircle } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Badge } from '@repo/ui/badge';
import { getA11yMetadata } from '@/a11y/a11y-catalog';
import { A11yRulesSection } from '@/components/dev/a11y-rules-section';
import { CodeBlock } from '@/components/dev/code-block';
import { DevPageLayout } from '@/components/dev/dev-page-layout';
import type { DevNavItem } from '@/components/dev/dev-page-nav';
import { DevSection } from '@/components/dev/dev-section';
import { ExamplePreview } from '@/components/dev/example-preview';
import { extractExample } from '@/components/dev/extract-example';
import { PropTable } from '@/components/dev/prop-table';
import selfSource from './badge-reference-page.tsx?raw';

const navItems: DevNavItem[] = [
  { id: 'full-example', text: 'Full example', level: 2 },
  { id: 'usage', text: 'Usage', level: 2 },
  { id: 'composition', text: 'Composition', level: 2 },
  { id: 'colors', text: 'Colors', level: 2 },
  { id: 'shapes', text: 'Shapes', level: 2 },
  { id: 'sizes', text: 'Sizes', level: 2 },
  { id: 'icons', text: 'Icons', level: 2 },
  { id: 'accessibility', text: 'Accessibility', level: 2 },
  { id: 'api-reference', text: 'API reference', level: 2 },
];

const COLORS = ['bc-blue', 'bc-gold', 'dark', 'blue', 'grey', 'green', 'red', 'yellow'] as const;
const SHAPES = [
  { shape: 'rectangular', label: 'Rectangular' },
  { shape: 'rounded', label: 'Rounded' },
] as const;
const SIZES = [
  { size: 'sm', label: 'Small' },
  { size: 'medium', label: 'Medium' },
] as const;

/** Shared by "Full example" and "Colors" — same sweep, different framing. */
function ColorSweepExample() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {COLORS.map((color) => (
        <Badge key={color} color={color}>
          {color}
        </Badge>
      ))}
    </div>
  );
}

const FULL_EXAMPLE_CODE = COLORS.map((color) => `<Badge color="${color}">${color}</Badge>`).join(
  '\n',
);

function ShapesExample() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {SHAPES.map((s) => (
        <Badge key={s.shape} shape={s.shape}>
          {s.label}
        </Badge>
      ))}
    </div>
  );
}

const SHAPES_CODE = SHAPES.map((s) => `<Badge shape="${s.shape}">${s.label}</Badge>`).join('\n');

function SizesExample() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {SIZES.map((s) => (
        <Badge key={s.size} size={s.size}>
          {s.label}
        </Badge>
      ))}
    </div>
  );
}

const SIZES_CODE = SIZES.map((s) => `<Badge size="${s.size}">${s.label}</Badge>`).join('\n');

const USAGE_IMPORT_CODE = `import { Badge } from "@repo/ui/badge";`;

const USAGE_SKELETON_CODE = `<Badge>Badge</Badge>`;

function IconsExample() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {/* #region icons */}
      <Badge color="green">
        <Icon path={mdiCheckCircle} size="12px" data-icon="inline-start" aria-hidden={true} />
        Verified
      </Badge>
      <Badge color="red">
        Action needed
        <Icon path={mdiAlertCircle} size="12px" data-icon="inline-end" aria-hidden={true} />
      </Badge>
      {/* #endregion icons */}
    </div>
  );
}

export function BadgeReferencePage() {
  return (
    <DevPageLayout
      title="Badge"
      description="Displays a small status or category label. Colors are BCDS-specific — not shadcn's default palette."
      navItems={navItems}
      navLabel="On this page"
      navClassName="sticky top-0 h-screen overflow-y-auto"
    >
      <DevSection id="full-example" title="Full example">
        <ExamplePreview code={FULL_EXAMPLE_CODE}>
          <ColorSweepExample />
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
          Badge has no subcomponents — render it directly with text (and optionally an icon) as
          children. Use the <code className="text-xs bg-muted px-1.5 py-0.5 rounded">render</code>{' '}
          prop to render it as a different element (e.g. a Link) while keeping Badge's styling.
        </p>
      </DevSection>

      <DevSection
        id="colors"
        title="Colors"
        description="bc-blue, bc-gold, and dark are solid backgrounds. blue, grey, green, red, and yellow use a light background with a matching border — text stays the default foreground color rather than a tinted one."
      >
        <ExamplePreview code={FULL_EXAMPLE_CODE}>
          <ColorSweepExample />
        </ExamplePreview>
      </DevSection>

      <DevSection id="shapes" title="Shapes">
        <ExamplePreview code={SHAPES_CODE}>
          <ShapesExample />
        </ExamplePreview>
      </DevSection>

      <DevSection id="sizes" title="Sizes">
        <ExamplePreview code={SIZES_CODE}>
          <SizesExample />
        </ExamplePreview>
      </DevSection>

      <DevSection
        id="icons"
        title="Icons"
        description={
          'Set data-icon="inline-start" or "inline-end" on the icon so the badge adjusts its padding.'
        }
      >
        <ExamplePreview code={extractExample(selfSource, 'icons')}>
          <IconsExample />
        </ExamplePreview>
      </DevSection>

      <DevSection id="accessibility" title="Accessibility">
        <A11yRulesSection metadata={getA11yMetadata('badge')} />
      </DevSection>

      <DevSection id="api-reference" title="API reference">
        <div className="space-y-2">
          <p className="text-sm font-medium">Badge</p>
          <PropTable
            rows={[
              [
                'color',
                '"bc-blue" | "bc-gold" | "dark" | "blue" | "grey" | "green" | "red" | "yellow"',
                '"blue"',
                'Drives background, border, and text color together.',
              ],
              ['shape', '"rectangular" | "rounded"', '"rectangular"', '—'],
              ['size', '"sm" | "medium"', '"sm"', '—'],
              [
                'render',
                'ReactElement',
                '—',
                "Renders Badge as a different element (e.g. a Link) while keeping Badge's styling.",
              ],
            ]}
          />
        </div>
      </DevSection>
    </DevPageLayout>
  );
}

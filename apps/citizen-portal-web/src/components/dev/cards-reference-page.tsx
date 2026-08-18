import { mdiCake, mdiChevronRight } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Avatar, AvatarFallback } from '@repo/ui/avatar';
import { Button } from '@repo/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardIconAction,
  CardTitle,
} from '@repo/ui/card';
import { Link } from '@tanstack/react-router';
import { getA11yMetadata } from '@/a11y/a11y-catalog';
import { A11yRulesSection } from '@/components/dev/a11y-rules-section';
import { CardChevron } from '@/components/dev/card-chevron';
import { CodeBlock } from '@/components/dev/code-block';
import { DevPageLayout } from '@/components/dev/dev-page-layout';
import type { DevNavItem } from '@/components/dev/dev-page-nav';
import { DevSection } from '@/components/dev/dev-section';
import { ExamplePreview } from '@/components/dev/example-preview';
import { extractExample } from '@/components/dev/extract-example';
import { PropTable } from '@/components/dev/prop-table';
import selfSource from './cards-reference-page.tsx?raw';

const navItems: DevNavItem[] = [
  { id: 'full-example', text: 'Full example', level: 2 },
  { id: 'usage', text: 'Usage', level: 2 },
  { id: 'composition', text: 'Composition', level: 2 },
  { id: 'fw-column-link', text: 'Full width — column', level: 2 },
  { id: 'fw-column-no-link', text: 'No link', level: 3 },
  { id: 'fw-row-left', text: 'Full width — row', level: 2 },
  { id: 'fw-row-centered', text: 'Centered', level: 3 },
  { id: '2up-gap-centered', text: '2-up (24px gap)', level: 2 },
  { id: '2up-gap-left', text: 'Left aligned', level: 3 },
  { id: '2up-nogap-row', text: '2-up (no col gap) — row', level: 2 },
  { id: '2up-nogap-col-link', text: 'Column (link)', level: 3 },
  { id: '2up-nogap-col-no-link', text: 'Column (no link)', level: 3 },
  { id: '3up-gap-centered', text: '3-up (24px gap)', level: 2 },
  { id: 'accessibility', text: 'Accessibility', level: 2 },
  { id: 'api-reference', text: 'API reference', level: 2 },
];

const USAGE_IMPORT_CODE = `import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardIconAction,
  CardContent,
  CardFooter,
} from "@repo/ui/card";`;

const USAGE_SKELETON_CODE = `<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
  <CardFooter>Footer</CardFooter>
</Card>`;

const COMPOSITION_TREE = `Card
├── CardAction / CardIconAction
├── CardHeader
│   ├── CardTitle
│   └── CardDescription
├── CardContent
└── CardFooter`;

/** The wrapping centered/max-w-xs layout below is demo-only (constrains the card for this page's
 *  column of examples) — kept out of the region marker so the shown code is just the card itself. */
// #region full-example
function FullExampleCard() {
  return (
    <Card centered>
      <CardIconAction size="lg">
        <Icon path={mdiCake} size="32px" className="text-blue-80" aria-hidden={true} />
      </CardIconAction>
      <CardHeader>
        <CardTitle>Card title</CardTitle>
        <CardDescription>Supporting description text that can wrap onto two lines.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Additional content goes here — any supporting copy, a list, or form elements.</p>
      </CardContent>
      <CardFooter className="justify-center">
        <Button size="sm" variant="outline">
          Learn more
        </Button>
      </CardFooter>
    </Card>
  );
}
// #endregion full-example

// #region fw-column-link
function FwColumnLinkExample() {
  return (
    <div className="flex flex-col">
      <Link to="/" className="no-underline">
        <Card column className="hover:bg-blue-10 transition-colors border-l-4 border-l-gray-110">
          <CardAction className="pr-0" aria-hidden={true}>
            <Avatar variant="card">
              <AvatarFallback variant="card">AA</AvatarFallback>
            </Avatar>
          </CardAction>
          <CardHeader>
            <CardTitle>Amina Ali</CardTitle>
            <CardDescription>You • amina9990ali@bcmail.com</CardDescription>
          </CardHeader>
          <CardChevron />
        </Card>
      </Link>
      <Link to="/" className="no-underline">
        <Card
          column
          className="hover:bg-blue-10 transition-colors border-l-4 border-l-success-border"
        >
          <CardAction className="pr-0" aria-hidden={true}>
            <Avatar variant="card">
              <AvatarFallback variant="card">MK</AvatarFallback>
            </Avatar>
          </CardAction>
          <CardHeader>
            <CardTitle>Marcus Kim</CardTitle>
            <CardDescription>marcus.kim@bcmail.com</CardDescription>
          </CardHeader>
          <CardChevron />
        </Card>
      </Link>
    </div>
  );
}
// #endregion fw-column-link

// #region fw-column-no-link
function FwColumnNoLinkExample() {
  return (
    <Card column>
      <CardIconAction size="sm">
        <Icon path={mdiCake} size="32px" className="text-blue-80" aria-hidden={true} />
      </CardIconAction>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Supporting description text</CardDescription>
      </CardHeader>
    </Card>
  );
}
// #endregion fw-column-no-link

// #region fw-row-left
function FwRowLeftExample() {
  return (
    <Card>
      <CardIconAction size="lg">
        <Icon path={mdiCake} size="32px" className="text-blue-80" aria-hidden={true} />
      </CardIconAction>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Supporting description text</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Additional content goes here</p>
      </CardContent>
    </Card>
  );
}
// #endregion fw-row-left

// #region fw-row-centered
function FwRowCenteredExample() {
  return (
    <Card centered>
      <CardIconAction size="lg">
        <Icon path={mdiCake} size="32px" className="text-blue-80" aria-hidden={true} />
      </CardIconAction>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Supporting description text</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Additional content goes here</p>
      </CardContent>
    </Card>
  );
}
// #endregion fw-row-centered

// #region 2up-gap-centered
function TwoUpGapCenteredExample() {
  return (
    <div className="grid grid-cols-2 gap-6">
      <Card centered>
        <CardIconAction size="lg">
          <Icon path={mdiCake} size="32px" className="text-blue-80" aria-hidden={true} />
        </CardIconAction>
        <CardHeader>
          <CardTitle>
            <Link to="/" className="no-underline hover:underline">
              Online application
              <Icon
                path={mdiChevronRight}
                size="20px"
                className="inline-flex text-link"
                aria-hidden={true}
              />
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Apply online through MyBC</p>
        </CardContent>
      </Card>
      <Card centered>
        <CardIconAction size="lg">
          <Icon path={mdiCake} size="32px" className="text-blue-80" aria-hidden={true} />
        </CardIconAction>
        <CardHeader>
          <CardTitle>
            <Link to="/" className="no-underline hover:underline">
              Paper form
              <Icon
                path={mdiChevronRight}
                size="20px"
                className="inline-flex text-link"
                aria-hidden={true}
              />
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>You can apply by mail or in person</p>
        </CardContent>
      </Card>
      <Link to="/" className="no-underline">
        <Card centered className="hover:bg-blue-10 transition-colors h-full">
          <CardAction aria-hidden={true}>
            <Avatar variant="card">
              <AvatarFallback variant="card">BC</AvatarFallback>
            </Avatar>
          </CardAction>
          <CardHeader>
            <CardTitle>Avatar action</CardTitle>
            <CardDescription>Centered with avatar</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card content flows on to two lines to show that the cards will equalize height.</p>
          </CardContent>
        </Card>
      </Link>
      <Link to="/" className="no-underline">
        <Card centered className="hover:bg-blue-10 transition-colors h-full">
          <CardAction aria-hidden={true}>
            <Avatar variant="card">
              <AvatarFallback variant="card">MK</AvatarFallback>
            </Avatar>
          </CardAction>
          <CardHeader>
            <CardTitle>Avatar action</CardTitle>
            <CardDescription>Centered with avatar</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card content</p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
// #endregion 2up-gap-centered

// #region 2up-gap-left
function TwoUpGapLeftExample() {
  return (
    <div className="grid grid-cols-2 gap-6">
      <Card>
        <CardIconAction size="sm">
          <Icon path={mdiCake} size="32px" className="text-blue-80" aria-hidden={true} />
        </CardIconAction>
        <CardContent>
          <p className="font-semibold">Income Assistance</p>
          <CardDescription>
            Financial assistance to support your transition to employment.
          </CardDescription>
        </CardContent>
      </Card>
      <Card>
        <CardIconAction size="sm">
          <Icon path={mdiCake} size="32px" className="text-blue-80" aria-hidden={true} />
        </CardIconAction>
        <CardContent>
          <p className="font-semibold">Person with Disabilities Designation Application</p>
          <CardDescription>
            Health and financial support for Income Assistance applicants with disabilities.
          </CardDescription>
        </CardContent>
      </Card>
      <Card>
        <CardAction>
          <Avatar variant="card">
            <AvatarFallback variant="card">JD</AvatarFallback>
          </Avatar>
        </CardAction>
        <CardHeader>
          <CardTitle>Avatar action</CardTitle>
          <CardDescription>Left aligned with avatar</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card content flows on to two lines to show that the cards will equalize height.</p>
        </CardContent>
      </Card>
      <Card>
        <CardAction>
          <Avatar variant="card">
            <AvatarFallback variant="card">MK</AvatarFallback>
          </Avatar>
        </CardAction>
        <CardHeader>
          <CardTitle>Avatar action</CardTitle>
          <CardDescription>Left aligned with avatar</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card content</p>
        </CardContent>
      </Card>
    </div>
  );
}
// #endregion 2up-gap-left

// #region 2up-nogap-row
function TwoUpNogapRowExample() {
  return (
    <div className="grid grid-cols-2 gap-y-4">
      <Link to="/" className="no-underline">
        <Card centered className="hover:bg-blue-10 transition-colors h-full">
          <CardIconAction size="lg">
            <Icon path={mdiCake} size="32px" className="text-blue-80" aria-hidden={true} />
          </CardIconAction>
          <CardHeader>
            <CardTitle>Consent history</CardTitle>
            <CardDescription>View a record of the consents you've provided.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Additional content goes here</p>
          </CardContent>
        </Card>
      </Link>
      <Link to="/" className="no-underline">
        <Card centered className="hover:bg-blue-10 transition-colors h-full">
          <CardIconAction size="lg">
            <Icon path={mdiCake} size="32px" className="text-blue-80" aria-hidden={true} />
          </CardIconAction>
          <CardHeader>
            <CardTitle>Manage delegates</CardTitle>
            <CardDescription>Manage people who can act on your behalf.</CardDescription>
          </CardHeader>
        </Card>
      </Link>
    </div>
  );
}
// #endregion 2up-nogap-row

// #region 2up-nogap-col-link
function TwoUpNogapColLinkExample() {
  return (
    <div className="grid grid-cols-2 gap-y-4">
      <Link to="/" className="no-underline">
        <Card column className="hover:bg-blue-10 transition-colors h-full">
          <CardAction className="pr-0" aria-hidden={true}>
            <Avatar variant="card">
              <AvatarFallback variant="card">AA</AvatarFallback>
            </Avatar>
          </CardAction>
          <CardHeader>
            <CardTitle>Amina Ali</CardTitle>
            <CardDescription>amina9990ali@bcmail.com</CardDescription>
          </CardHeader>
          <CardChevron />
        </Card>
      </Link>
      <Link to="/" className="no-underline">
        <Card column className="hover:bg-blue-10 transition-colors h-full">
          <CardAction className="pr-0" aria-hidden={true}>
            <Avatar variant="card">
              <AvatarFallback variant="card">MK</AvatarFallback>
            </Avatar>
          </CardAction>
          <CardHeader>
            <CardTitle>Marcus Kim</CardTitle>
            <CardDescription>marcus.kim@bcmail.com</CardDescription>
          </CardHeader>
          <CardChevron />
        </Card>
      </Link>
      <Link to="/" className="no-underline">
        <Card column className="hover:bg-blue-10 transition-colors h-full">
          <CardIconAction size="sm">
            <Icon path={mdiCake} size="32px" className="text-blue-80" aria-hidden={true} />
          </CardIconAction>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Supporting description</CardDescription>
          </CardHeader>
          <CardChevron />
        </Card>
      </Link>
      <Link to="/" className="no-underline">
        <Card column className="hover:bg-blue-10 transition-colors h-full">
          <CardIconAction size="sm">
            <Icon path={mdiCake} size="32px" className="text-blue-80" aria-hidden={true} />
          </CardIconAction>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Supporting description</CardDescription>
          </CardHeader>
          <CardChevron />
        </Card>
      </Link>
    </div>
  );
}
// #endregion 2up-nogap-col-link

// #region 2up-nogap-col-no-link
function TwoUpNogapColNoLinkExample() {
  return (
    <div className="grid grid-cols-2 gap-y-4">
      <Card column>
        <CardAction className="pr-0">
          <Avatar variant="card">
            <AvatarFallback variant="card">AA</AvatarFallback>
          </Avatar>
        </CardAction>
        <CardHeader>
          <CardTitle>Amina Ali</CardTitle>
          <CardDescription>amina9990ali@bcmail.com</CardDescription>
        </CardHeader>
      </Card>
      <Card column>
        <CardAction className="pr-0">
          <Avatar variant="card">
            <AvatarFallback variant="card">MK</AvatarFallback>
          </Avatar>
        </CardAction>
        <CardHeader>
          <CardTitle>Marcus Kim</CardTitle>
          <CardDescription>marcus.kim@bcmail.com</CardDescription>
        </CardHeader>
      </Card>
      <Card column>
        <CardIconAction size="sm">
          <Icon path={mdiCake} size="32px" className="text-blue-80" aria-hidden={true} />
        </CardIconAction>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Supporting description</CardDescription>
        </CardHeader>
      </Card>
      <Card column>
        <CardIconAction size="sm">
          <Icon path={mdiCake} size="32px" className="text-blue-80" aria-hidden={true} />
        </CardIconAction>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Supporting description</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
// #endregion 2up-nogap-col-no-link

// #region 3up-gap-centered
function ThreeUpGapCenteredExample() {
  return (
    <div className="grid grid-cols-3 gap-6">
      <Card centered>
        <CardIconAction size="lg">
          <Icon path={mdiCake} size="32px" className="text-blue-80" aria-hidden={true} />
        </CardIconAction>
        <CardHeader>
          <CardTitle>Discover services</CardTitle>
          <CardDescription>Browse and search for government services.</CardDescription>
        </CardHeader>
      </Card>
      <Card centered>
        <CardIconAction size="lg">
          <Icon path={mdiCake} size="32px" className="text-blue-80" aria-hidden={true} />
        </CardIconAction>
        <CardHeader>
          <CardTitle>Apply and track your requests</CardTitle>
          <CardDescription>
            Submit applications online and check the status of your requests.
          </CardDescription>
        </CardHeader>
      </Card>
      <Card centered>
        <CardIconAction size="lg">
          <Icon path={mdiCake} size="32px" className="text-blue-80" aria-hidden={true} />
        </CardIconAction>
        <CardHeader>
          <CardTitle>Manage your information</CardTitle>
          <CardDescription>View and update your information in one place.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
// #endregion 3up-gap-centered

export function CardsReferencePage() {
  return (
    <DevPageLayout
      title="Card Boilerplate"
      description="Reference layouts for card patterns."
      navItems={navItems}
      navLabel="On this page"
      navClassName="sticky top-0 h-screen overflow-y-auto"
    >
      <DevSection id="full-example" title="Full example">
        <ExamplePreview code={extractExample(selfSource, 'full-example')}>
          <div className="flex justify-center">
            <div className="max-w-xs">
              <FullExampleCard />
            </div>
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
        id="composition"
        title="Composition"
        description="CardAction and CardIconAction are siblings of CardHeader — direct children of Card — not nested inside it."
      >
        <div className="space-y-4">
          <CodeBlock code={COMPOSITION_TREE} />
          <p className="text-sm text-muted-foreground">
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">CardIconAction</code> is our
            addition on top of shadcn's Card — it wraps{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">CardAction</code> in an icon
            badge instead of using it directly for an avatar or custom action. See{' '}
            <a href="#api-reference" className="text-link hover:underline">
              API reference
            </a>{' '}
            below for its props.
          </p>
        </div>
      </DevSection>

      <DevSection
        id="fw-column-link"
        title="Full width — column layout (link)"
        description="column on Card. Action | Title + Description | Chevron. Wrapped in TanStack Link. Stacked with no gap between cards. Optional: a colored left border (border-l-4 border-l-<color>) to flag status/category — shown here on both cards."
      >
        <ExamplePreview code={extractExample(selfSource, 'fw-column-link')}>
          <FwColumnLinkExample />
        </ExamplePreview>
      </DevSection>

      <DevSection
        id="fw-column-no-link"
        title="Full width — column layout (no link)"
        description="Same structure, not wrapped in Link."
      >
        <ExamplePreview code={extractExample(selfSource, 'fw-column-no-link')}>
          <FwColumnNoLinkExample />
        </ExamplePreview>
      </DevSection>

      <DevSection
        id="fw-row-left"
        title="Full width — row layout, left aligned"
        description="Default Card (flex-col). Action, Title, Description, Content stacked vertically."
      >
        <ExamplePreview code={extractExample(selfSource, 'fw-row-left')}>
          <FwRowLeftExample />
        </ExamplePreview>
      </DevSection>

      <DevSection
        id="fw-row-centered"
        title="Full width — row layout, centered"
        description="centered prop on Card centers text and CardAction."
      >
        <ExamplePreview code={extractExample(selfSource, 'fw-row-centered')}>
          <FwRowCenteredExample />
        </ExamplePreview>
      </DevSection>

      <DevSection
        id="2up-gap-centered"
        title="2-up (24px gap) — row layout, centered"
        description="grid grid-cols-2 gap-6. Icon action and avatar action variants."
      >
        <ExamplePreview code={extractExample(selfSource, '2up-gap-centered')}>
          <TwoUpGapCenteredExample />
        </ExamplePreview>
      </DevSection>

      <DevSection
        id="2up-gap-left"
        title="2-up (24px gap) — row layout, left aligned"
        description="grid grid-cols-2 gap-6. Icon action and avatar action variants."
      >
        <ExamplePreview code={extractExample(selfSource, '2up-gap-left')}>
          <TwoUpGapLeftExample />
        </ExamplePreview>
      </DevSection>

      <DevSection
        id="2up-nogap-row"
        title="2-up (no column gap, 16px row gap) — row layout, centered (link)"
        description="grid grid-cols-2 gap-y-4. Centered row layout. Full card wrapped in Link."
      >
        <ExamplePreview code={extractExample(selfSource, '2up-nogap-row')}>
          <TwoUpNogapRowExample />
        </ExamplePreview>
      </DevSection>

      <DevSection
        id="2up-nogap-col-link"
        title="2-up (no column gap, 16px row gap) — column layout (link)"
        description="grid grid-cols-2 gap-y-4. column on Card. Wrapped in TanStack Link."
      >
        <ExamplePreview code={extractExample(selfSource, '2up-nogap-col-link')}>
          <TwoUpNogapColLinkExample />
        </ExamplePreview>
      </DevSection>

      <DevSection
        id="2up-nogap-col-no-link"
        title="2-up (no column gap, 16px row gap) — column layout (no link)"
        description="Same structure, not wrapped in Link."
      >
        <ExamplePreview code={extractExample(selfSource, '2up-nogap-col-no-link')}>
          <TwoUpNogapColNoLinkExample />
        </ExamplePreview>
      </DevSection>

      <DevSection
        id="3up-gap-centered"
        title="3-up (24px gap) — row layout, centered"
        description="grid grid-cols-3 gap-6. Centered, icon action, no link."
      >
        <ExamplePreview code={extractExample(selfSource, '3up-gap-centered')}>
          <ThreeUpGapCenteredExample />
        </ExamplePreview>
      </DevSection>

      <DevSection id="accessibility" title="Accessibility">
        <A11yRulesSection metadata={getA11yMetadata('card')} />
      </DevSection>

      <DevSection id="api-reference" title="API reference">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium">Card</p>
            <PropTable
              rows={[
                [
                  'column',
                  'boolean',
                  'false',
                  'Switches to flex-row. Automatically applies pr-0 to CardAction and flex-1 to CardHeader — no need to set these manually.',
                ],
                ['centered', 'boolean', 'false', 'Centers all text and mx-auto on CardAction.'],
                ['size', '"default" | "sm"', '"default"', 'Scales padding throughout the card.'],
              ]}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">CardIconAction</p>
            <p className="text-sm text-muted-foreground">
              Encapsulates the icon badge. Handles positioning for both row and column layouts
              automatically — no extra classNames needed.
            </p>
            <PropTable
              rows={[
                [
                  'size',
                  '"sm" | "lg"',
                  '"lg"',
                  'sm = 48px badge, p-2 padding (column layout). lg = 72px badge, p-5 padding (row layout).',
                ],
              ]}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Avatar — card variant</p>
            <p className="text-sm text-muted-foreground">
              Apply <code className="text-xs bg-muted px-1.5 py-0.5 rounded">variant="card"</code>{' '}
              to both Avatar and AvatarFallback.
            </p>
            <PropTable
              rows={[
                ['variant="card" on Avatar', '—', '—', '48px size, 4px white border.'],
                [
                  'variant="card" on AvatarFallback',
                  '—',
                  '—',
                  'bg-blue-10, bold, uppercase, text-blue-80, 16px font size.',
                ],
              ]}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Grid layouts</p>
            <p className="text-sm text-muted-foreground">
              No shared grid component — hard-code the Tailwind classes directly so these examples
              stay copy-paste ready.
            </p>
            <PropTable
              rows={[
                ['grid grid-cols-2 gap-6', '—', '—', '2-up, 24px gap on all sides.'],
                [
                  'grid grid-cols-2 gap-y-4',
                  '—',
                  '—',
                  '2-up, 16px row gap only — cards touch horizontally.',
                ],
                ['grid grid-cols-3 gap-6', '—', '—', '3-up, 24px gap on all sides.'],
              ]}
            />
          </div>
        </div>
      </DevSection>
    </DevPageLayout>
  );
}

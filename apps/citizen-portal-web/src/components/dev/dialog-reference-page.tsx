import { Button } from '@repo/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/dialog';
import { Input } from '@repo/ui/input';
import { Label } from '@repo/ui/label';
import { Link } from '@tanstack/react-router';
import { Check, Menu, X } from 'lucide-react';
import { CodeBlock } from '@/components/dev/code-block';
import { DevPageLayout } from '@/components/dev/dev-page-layout';
import type { DevNavItem } from '@/components/dev/dev-page-nav';
import { DevSection } from '@/components/dev/dev-section';
import { ExamplePreview } from '@/components/dev/example-preview';
import { extractExample } from '@/components/dev/extract-example';
import { PropTable } from '@/components/dev/prop-table';
import selfSource from './dialog-reference-page.tsx?raw';

const navItems: DevNavItem[] = [
  { id: 'full-example', text: 'Full example', level: 2 },
  { id: 'usage', text: 'Usage', level: 2 },
  { id: 'composition', text: 'Composition', level: 2 },
  { id: 'confirmation', text: 'Confirmation', level: 2 },
  { id: 'full-screen', text: 'Full-screen', level: 2 },
  { id: 'accessibility', text: 'Accessibility', level: 2 },
  { id: 'api-reference', text: 'API reference', level: 2 },
];

const USAGE_IMPORT_CODE = `import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@repo/ui/dialog";`;

const USAGE_SKELETON_CODE = `<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    Content
    <DialogFooter>
      <DialogClose>Close</DialogClose>
    </DialogFooter>
  </DialogContent>
</Dialog>`;

const COMPOSITION_TREE = `Dialog
├── DialogTrigger
└── DialogContent          (wraps DialogPortal + DialogOverlay internally — rarely touched directly)
    ├── DialogHeader
    │   ├── DialogTitle           (required — see Accessibility below)
    │   └── DialogDescription
    ├── your content
    └── DialogFooter
        └── DialogClose`;

/** Mirrors CreateWorkspaceModal (platform-web) — a form dialog: header, a labeled field, and a
 *  footer with Cancel + Submit. Uncontrolled here (no open/onOpenChange) so the demo needs no
 *  state; real callers are almost always controlled instead, to drive a mutation on submit. */
// #region full-example
function FullExampleDialog() {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Create workspace</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create workspace</DialogTitle>
          <DialogDescription>Add a new workspace to organise your services.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dev-dialog-workspace-name">Workspace name</Label>
          <Input id="dev-dialog-workspace-name" placeholder="e.g. City of Riverton" />
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <Button type="submit">Create workspace</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
// #endregion full-example

const PUBLISH_APPLICATIONS = [
  { title: 'Apply online', hasStructure: true },
  { title: 'Apply by mail', hasStructure: false },
] as const;

/** Mirrors ServicePublishModal (platform-web) — a confirmation with a real summary (not just
 *  yes/no) and a Submit disabled until the summary says it's safe to proceed. For a pure yes/no
 *  destructive confirm instead, reach for AlertDialog. */
// #region confirmation
function ConfirmationExample() {
  const structureless = PUBLISH_APPLICATIONS.filter((app) => !app.hasStructure);
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Publish service</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish service?</DialogTitle>
          <DialogDescription>
            Publishing makes the service and its application methods live.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {PUBLISH_APPLICATIONS.length} application methods will be published with the service:
          </p>
          <ul className="flex flex-col gap-1.5">
            {PUBLISH_APPLICATIONS.map((app) => (
              <li key={app.title} className="flex items-center gap-2 text-sm">
                {app.hasStructure ? (
                  <Check className="size-4 shrink-0 text-primary" aria-hidden />
                ) : (
                  <X className="size-4 shrink-0 text-destructive" aria-hidden />
                )}
                <span className="min-w-0 truncate">{app.title}</span>
                {app.hasStructure ? null : (
                  <span className="text-xs text-destructive">no fields</span>
                )}
              </li>
            ))}
          </ul>
          {structureless.length > 0 ? (
            <p className="text-sm text-destructive">
              Add fields to every method before publishing.
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <Button disabled={structureless.length > 0}>Publish</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
// #endregion confirmation

/** Mirrors MobileMenu (citizen-portal-web's site-header) — DialogContent's className fully
 *  overrides the default centered-card positioning to cover the whole viewport, the corner close
 *  button is turned off (showCloseButton={false}) in favour of a hand-styled one inline with the
 *  header row, and DialogTitle is visually hidden (sr-only) since "Menu" is redundant on screen
 *  but still required for the accessible name. */
// #region full-screen
function FullScreenExample() {
  return (
    <Dialog>
      <DialogTrigger aria-label="Menu" render={<Button variant="ghost" size="icon" />}>
        <Menu className="size-6" aria-hidden />
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="top-0 left-0 flex h-svh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-background p-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">Menu</DialogTitle>
        <div className="flex items-center justify-between border-b p-4">
          <span className="font-semibold">Menu</span>
          <DialogClose aria-label="Close menu" render={<Button variant="ghost" size="icon" />}>
            <X className="size-6" aria-hidden />
          </DialogClose>
        </div>
        <nav aria-label="Menu" className="flex flex-col gap-1 p-4">
          <Link
            to="/"
            className="rounded-md px-3 py-3 text-lg font-medium no-underline hover:bg-secondary-hover"
          >
            Home
          </Link>
          <Link
            to="/"
            className="rounded-md px-3 py-3 text-lg font-medium no-underline hover:bg-secondary-hover"
          >
            Services
          </Link>
        </nav>
      </DialogContent>
    </Dialog>
  );
}
// #endregion full-screen

export function DialogReferencePage() {
  return (
    <DevPageLayout
      title="Dialog"
      description="A modal window that interrupts the page — a form, a confirmation, or (rarely) a full-screen takeover. For a lightweight, non-blocking menu of actions instead, see the dropdown-menu page."
      navItems={navItems}
      navLabel="On this page"
      navClassName="sticky top-0 h-screen overflow-y-auto"
    >
      <DevSection id="full-example" title="Full example">
        <ExamplePreview code={extractExample(selfSource, 'full-example')}>
          <FullExampleDialog />
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
        description={
          <>
            There are three independent{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">showCloseButton</code> toggles,
            easy to mix up:{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">DialogContent</code>'s (the
            corner X, defaults <code className="text-xs bg-muted px-1.5 py-0.5 rounded">true</code>)
            , <code className="text-xs bg-muted px-1.5 py-0.5 rounded">DialogHeader</code>'s
            (reserves <code className="text-xs bg-muted px-1.5 py-0.5 rounded">pr-6</code> so the
            title/description don't run under that X, also defaults{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">true</code> — set it to match
            whenever you change DialogContent's), and{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">DialogFooter</code>'s (an extra
            Close button in the footer row, defaults{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">false</code>). The trigger
            above composes a real Button via render, per shadcn convention, rather than styling the
            bare Trigger by hand — real usage in this app is split on that; see "Full-screen" below
            for one that hand-styles it instead, for a reason specific to that layout.
          </>
        }
      >
        <CodeBlock code={COMPOSITION_TREE} />
      </DevSection>

      <DevSection
        id="confirmation"
        title="Confirmation"
        description="Publish is disabled until every listed method is valid — a confirmation can gate on more than a single yes/no."
      >
        <ExamplePreview code={extractExample(selfSource, 'confirmation')}>
          <ConfirmationExample />
        </ExamplePreview>
      </DevSection>

      <DevSection
        id="full-screen"
        title="Full-screen"
        description="Opens covering the entire viewport, not just the preview box below — that's intentional, matching the real mobile nav this is modeled on."
      >
        <ExamplePreview code={extractExample(selfSource, 'full-screen')}>
          <FullScreenExample />
        </ExamplePreview>
      </DevSection>

      <DevSection id="accessibility" title="Accessibility">
        <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
          <li>
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">DialogTitle</code> is required
            on every dialog — base-ui needs it for the popup's accessible name. Hide it visually
            with <code className="text-xs bg-muted px-1.5 py-0.5 rounded">sr-only</code> rather than
            omitting it, like the full-screen example above.
          </li>
          <li>
            Modal dialogs (the default —{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">modal</code> defaults to{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">true</code>) trap focus and
            return it to the trigger on close, automatically.
          </li>
          <li>
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{'modal={false}'}</code> is a
            real, if rare, escape hatch — CreateWorkspaceModal's forced onboarding variant uses it
            so the sidebar profile card stays interactive while the gate is up.
          </li>
          <li>
            An icon-only{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">DialogTrigger</code> or{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">DialogClose</code> (e.g. the
            full-screen example's menu/close buttons) always needs an{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">aria-label</code>.
          </li>
        </ul>
      </DevSection>

      <DevSection id="api-reference" title="API reference">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium">Dialog</p>
            <PropTable
              rows={[
                [
                  'modal',
                  'boolean | "trap-focus"',
                  'true',
                  'false lets other page content stay interactive while open.',
                ],
                ['open / onOpenChange', 'boolean / function', '—', 'Controlled open state.'],
              ]}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">DialogContent</p>
            <PropTable
              rows={[
                [
                  'showCloseButton',
                  'boolean',
                  'true',
                  "The corner X button. Unrelated to DialogHeader's or DialogFooter's props of the same name.",
                ],
              ]}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">DialogHeader</p>
            <PropTable
              rows={[
                [
                  'showCloseButton',
                  'boolean',
                  'true',
                  "Adds pr-6 so the title/description don't run under DialogContent's corner X. Set to match whenever you change that prop on DialogContent.",
                ],
              ]}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">DialogFooter</p>
            <PropTable
              rows={[
                [
                  'showCloseButton',
                  'boolean',
                  'false',
                  'Adds its own Close button after your children — most real usage renders an explicit DialogClose instead (shown throughout this page) for more control over label/variant.',
                ],
              ]}
            />
          </div>
        </div>
      </DevSection>
    </DevPageLayout>
  );
}

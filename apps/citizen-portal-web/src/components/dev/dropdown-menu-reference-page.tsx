import { Avatar, AvatarFallback } from '@repo/ui/avatar';
import { Button } from '@repo/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import { Link } from '@tanstack/react-router';
import { ChevronDown, EllipsisVertical, LogOut, UserCog } from 'lucide-react';
import { CodeBlock } from '@/components/dev/code-block';
import { DevPageLayout } from '@/components/dev/dev-page-layout';
import type { DevNavItem } from '@/components/dev/dev-page-nav';
import { DevSection } from '@/components/dev/dev-section';
import { ExamplePreview } from '@/components/dev/example-preview';
import { extractExample } from '@/components/dev/extract-example';
import { PropTable } from '@/components/dev/prop-table';
import selfSource from './dropdown-menu-reference-page.tsx?raw';

const navItems: DevNavItem[] = [
  { id: 'full-example', text: 'Full example', level: 2 },
  { id: 'usage', text: 'Usage', level: 2 },
  { id: 'composition', text: 'Composition', level: 2 },
  { id: 'actions-vs-links', text: 'Actions vs. links', level: 2 },
  { id: 'overflow-actions', text: 'Overflow actions', level: 2 },
  { id: 'with-header', text: 'With a header', level: 2 },
  { id: 'accessibility', text: 'Accessibility', level: 2 },
  { id: 'api-reference', text: 'API reference', level: 2 },
];

const USAGE_IMPORT_CODE = `import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@repo/ui/dropdown-menu";`;

const USAGE_SKELETON_CODE = `<DropdownMenu>
  <DropdownMenuTrigger>Open</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Item</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>`;

const COMPOSITION_TREE = `DropdownMenu
├── DropdownMenuTrigger
└── DropdownMenuContent
    ├── DropdownMenuGroup
    │   ├── DropdownMenuLabel   (must be a child of Group — throws otherwise)
    │   └── DropdownMenuItem
    ├── DropdownMenuSeparator
    ├── DropdownMenuSub
    │   ├── DropdownMenuSubTrigger
    │   └── DropdownMenuSubContent
    │       └── DropdownMenuItem
    ├── DropdownMenuCheckboxItem           (no real usage yet — see API reference)
    └── DropdownMenuRadioGroup / RadioItem (no real usage yet — see API reference)`;

/** The canonical composition: a labeled group of items, a nested Sub flyout, and a destructive
 *  item at the end. Not pulled from a specific real file (unlike the sections below) — it's the
 *  shape most dropdown menus converge on, so it's the page's full example. */
// #region full-example
function FullExampleMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        Menu
        <ChevronDown className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>Billing</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>Team</DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Invite users</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Email</DropdownMenuItem>
              <DropdownMenuItem>Message</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem>New Team</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
// #endregion full-example

/** DropdownMenuItem defaults to a plain `<div role="menuitem">` — correct for an action (fires
 *  onClick, then closes the menu). For an item that navigates to a real page, compose it as a
 *  Link via `render` instead — same pattern as the trigger's Button above, just on the item. */
// #region actions-vs-links
function ActionsVsLinksExample() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>Menu</DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem render={<Link to="/" />}>
          <UserCog className="size-4" aria-hidden />
          Account settings
        </DropdownMenuItem>
        <DropdownMenuItem>
          <LogOut className="size-4" aria-hidden />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
// #endregion actions-vs-links

/** Inspired by ServiceMenu (platform-web) — an icon-only "more actions" overflow menu: mixed
 *  enabled/disabled/destructive items and contextual helper text below the items. The trigger
 *  composes a real Button (outline, icon-only) via render, same pattern as the full example above
 *  — ServiceMenu's actual code hand-styles a bare Trigger instead of doing this. */
// #region overflow-actions
function OverflowActionsExample() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="More actions"
        render={<Button variant="outline" size="icon" />}
      >
        <EllipsisVertical className="size-4.5" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
        <DropdownMenuItem>Archive service</DropdownMenuItem>
        <DropdownMenuItem disabled>Publish service</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" disabled>
          Delete service
        </DropdownMenuItem>
        <p className="px-2 py-1 text-xs text-muted-foreground">
          Has submissions — archive it instead.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
// #endregion overflow-actions

/** Mirrors ProfileMenu (both apps) — a non-interactive user-info block above the items, a Link
 *  item via the `render` prop, and a destructive log-out item. */
// #region with-header
function WithHeaderExample() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="rounded-full focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <Avatar variant="card" size="sm">
          <AvatarFallback variant="card">AA</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex flex-col px-2 py-1.5">
          <span className="text-[13px] font-semibold">Amina Ali</span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            amina@example.com
          </span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link to="/" />}>
          <UserCog className="size-4" aria-hidden />
          Account settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive">
          <LogOut className="size-4" aria-hidden />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
// #endregion with-header

export function DropdownMenuReferencePage() {
  return (
    <DevPageLayout
      title="Dropdown menu"
      description="A menu of actions or options, opened from a trigger. Used for account menus and overflow (⋯) action menus — not for form selects (see the form-elements page)."
      navItems={navItems}
      navLabel="On this page"
      navClassName="sticky top-0 h-screen overflow-y-auto"
    >
      <DevSection id="full-example" title="Full example">
        <ExamplePreview code={extractExample(selfSource, 'full-example')}>
          <FullExampleMenu />
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
            The full example above composes Group, Label, and Sub — real, but not otherwise used
            anywhere in this app yet.{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">DropdownMenuLabel</code> must
            be a child of{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">DropdownMenuGroup</code> — on
            its own it throws (base-ui needs the group context to wire up{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">aria-labelledby</code>).
            CheckboxItem and RadioGroup/RadioItem remain undemonstrated; see API reference below for
            their props. The trigger there also composes a real Button via the render prop, per
            shadcn convention, rather than styling the bare Trigger by hand.
          </>
        }
      >
        <CodeBlock code={COMPOSITION_TREE} />
      </DevSection>

      <DevSection
        id="actions-vs-links"
        title="Actions vs. links"
        description={
          <>
            Every item is one of two shapes. Left as-is, an item is an <strong>action</strong>: a
            plain{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
              {'<div role="menuitem">'}
            </code>{' '}
            that fires its <code className="text-xs bg-muted px-1.5 py-0.5 rounded">onClick</code>{' '}
            and then closes the menu — right for things like "Log out" that don't go anywhere. For
            an item that navigates to a real page, compose it as a <strong>link</strong> instead,
            with the same <code className="text-xs bg-muted px-1.5 py-0.5 rounded">render</code>{' '}
            prop used on the trigger above:
          </>
        }
      >
        <ExamplePreview code={extractExample(selfSource, 'actions-vs-links')}>
          <ActionsVsLinksExample />
        </ExamplePreview>
        <p className="mt-4 text-sm text-muted-foreground">
          Base UI actually ships a dedicated{' '}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">Menu.LinkItem</code> for
          navigation (it renders an{' '}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{'<a>'}</code> natively, and
          closes on click by default rather than staying open) — but{' '}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">@repo/ui/dropdown-menu</code>{' '}
          doesn't expose it, so{' '}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">render</code> +{' '}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{'<Link>'}</code> on the regular
          Item is how every real link item in this app gets there today. Don't flip that default the
          other way, either — an action item rendered as an{' '}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{'<a>'}</code> with no{' '}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">href</code> breaks "open in new
          tab" / "copy link" and announces as a link to assistive tech for something that isn't
          navigating anywhere.
        </p>
      </DevSection>

      <DevSection
        id="overflow-actions"
        title="Overflow actions"
        description="Inspired by ServiceMenu (platform-web) — an icon-only Button trigger, mixed enabled/disabled/destructive items, and contextual helper text below the items."
      >
        <ExamplePreview code={extractExample(selfSource, 'overflow-actions')}>
          <OverflowActionsExample />
        </ExamplePreview>
      </DevSection>

      <DevSection
        id="with-header"
        title="With a header"
        description="A non-interactive block (name/email) above the items — plain markup, not a DropdownMenu part. Mixes both item shapes from 'Actions vs. links' above: Account settings navigates (render + Link), Log out doesn't (plain action)."
      >
        <ExamplePreview code={extractExample(selfSource, 'with-header')}>
          <WithHeaderExample />
        </ExamplePreview>
      </DevSection>

      <DevSection id="accessibility" title="Accessibility">
        <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
          <li>
            base-ui's Menu wires up{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">role="menu"</code>/
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">"menuitem"</code> and arrow-key
            / Escape keyboard navigation automatically.
          </li>
          <li>
            An icon-only{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">DropdownMenuTrigger</code>{' '}
            (e.g. the overflow ⋯ button) always needs an{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">aria-label</code> — there's no
            visible text for assistive tech to read.
          </li>
          <li>
            Prefer{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">variant="destructive"</code> on
            the item (shown in the full example) over hand-rolling a{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">text-destructive</code>{' '}
            className — the variant also tints hover/focus background and any icon inside, not just
            the text. Every real destructive item in this app today predates the variant prop and
            only sets text color by hand.
          </li>
          <li>Either way, keep clear label text too — color alone isn't a reliable signal.</li>
          <li>
            Only use <code className="text-xs bg-muted px-1.5 py-0.5 rounded">render</code> +{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{'<Link>'}</code> (see "Actions
            vs. links" above) for items that actually navigate — an action item rendered as a link
            with no destination is a real anti-pattern, not just a style choice.
          </li>
        </ul>
      </DevSection>

      <DevSection id="api-reference" title="API reference">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium">DropdownMenuContent</p>
            <PropTable
              rows={[
                ['align', '"start" | "center" | "end"', '"start"', '—'],
                ['side', '"top" | "right" | "bottom" | "left"', '"bottom"', '—'],
                ['sideOffset', 'number', '4', 'Gap between trigger and content, in px.'],
              ]}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">DropdownMenuItem</p>
            <PropTable
              rows={[
                ['inset', 'boolean', 'false', 'Extra left padding to align with icon-led items.'],
                ['variant', '"default" | "destructive"', '"default"', '—'],
                [
                  'render',
                  'ReactElement',
                  '—',
                  'Renders the item as a different element (e.g. a Link) while keeping its styling and keyboard behaviour.',
                ],
              ]}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">
              No real usage yet: DropdownMenuCheckboxItem, DropdownMenuRadioGroup / RadioItem,
              DropdownMenuShortcut
            </p>
            <p className="text-sm text-muted-foreground">
              All exist and follow the same shadcn/base-ui shape as the rest of this primitive —
              reach for them (checkbox/radio items for a settings-style toggle list) rather than
              hand-rolling the pattern, but there's no real usage anywhere in this app to base an
              example on. DropdownMenuGroup, DropdownMenuLabel, and DropdownMenuSub / SubTrigger /
              SubContent are demonstrated in the full example above instead, for the same reason.
            </p>
          </div>
        </div>
      </DevSection>
    </DevPageLayout>
  );
}

import { mdiAlertOutline, mdiDotsHorizontal, mdiPlus } from '@mdi/js';
import { Icon } from '@mdi/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/alert-dialog';
import { Button } from '@repo/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@repo/ui/tabs';
import { useId, useState } from 'react';
import { DEFAULT_VARIANT } from '../document-types';
import type { MissingField } from './variant-problems';
import { VariantNameDialog, type NameRequest } from './variant-name-dialog';

export interface VariantTabsProps {
  /** Every variant's name, `default` first (doc 262 rule 1). */
  names: readonly string[];
  active: string;
  onSelect: (name: string) => void;
  /** Each variant's missing required fields (rule 16); a variant absent here misses none. */
  missing: ReadonlyMap<string, readonly MissingField[]>;
  /** Doc 284: the variants marked display only — never filled in, so never missing anything. */
  displayOnly: ReadonlySet<string>;
  /** Doc 284 rule 4: the active variant's "Display only" switch. */
  onDisplayOnly: (name: string, on: boolean) => void;
  /** Whether New, Rename and Delete are offered (rule 11): not on a document a template governs. */
  manage: boolean;
  onCreate: (name: string) => void;
  onRename: (from: string, to: string) => void;
  onDelete: (name: string) => void;
}

/** How a tab names its variant: `default` is "Default". */
export const variantLabel = (name: string) => (name === DEFAULT_VARIANT ? 'Default' : name);

/**
 * The variant strip under the header (doc 262 rules 1-16): one tab per variant, a warning count on any that misses a
 * required field, then — when the variant set may change — the active variant's menu (Rename, Delete; never on Default)
 * and New variant.
 */
export function VariantTabs(props: VariantTabsProps) {
  const { names, active, onSelect, missing, displayOnly, manage } = props;
  const [naming, setNaming] = useState<NameRequest | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  return (
    <div
      data-slot="document-studio-variants"
      className="flex h-8 shrink-0 items-center gap-1 border-b border-border px-2"
    >
      <Tabs
        value={active}
        onValueChange={(value: unknown) => {
          if (typeof value === 'string') onSelect(value);
        }}
        className="min-w-0"
      >
        <TabsList variant="line" aria-label="Variants" className="max-w-full overflow-x-auto">
          {names.map((name) => (
            <VariantTab
              key={name}
              name={name}
              missing={missing.get(name)}
              displayOnly={displayOnly.has(name)}
            />
          ))}
        </TabsList>
      </Tabs>
      {manage && active !== DEFAULT_VARIANT && (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`${variantLabel(active)} variant actions`}
            data-slot="variant-actions"
            className="flex size-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Icon path={mdiDotsHorizontal} size="16px" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-auto">
            <DropdownMenuItem onClick={() => setNaming({ mode: 'rename', from: active })}>
              Rename…
            </DropdownMenuItem>
            {/* Doc 284 rule 4: a variant that presents the document, exempt from the required-fields rule. */}
            <DropdownMenuCheckboxItem
              checked={displayOnly.has(active)}
              onCheckedChange={(checked: boolean) => props.onDisplayOnly(active, checked)}
            >
              Display only
            </DropdownMenuCheckboxItem>
            <DropdownMenuItem variant="destructive" onClick={() => setDeleting(active)}>
              Delete…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {manage && (
        <Button
          size="xs"
          variant="ghost"
          data-slot="variant-new"
          onClick={() => setNaming({ mode: 'create' })}
        >
          <Icon path={mdiPlus} size="14px" />
          New variant
        </Button>
      )}
      <VariantNameDialog
        request={naming}
        existing={names}
        onClose={() => setNaming(null)}
        onSubmit={(request, name) => {
          setNaming(null);
          if (request.mode === 'create') props.onCreate(name);
          else props.onRename(request.from, name);
        }}
      />
      <DeleteVariantDialog
        name={deleting}
        onClose={() => setDeleting(null)}
        onConfirm={(name) => {
          setDeleting(null);
          props.onDelete(name);
        }}
      />
    </div>
  );
}

/** One variant's tab: its label, and a warning count described by the fields it misses (rule 16). */
function VariantTab({
  name,
  missing,
  displayOnly,
}: {
  name: string;
  missing?: readonly MissingField[] | undefined;
  displayOnly: boolean;
}) {
  const descriptionId = useId();
  const count = missing?.length ?? 0;
  const description = displayOnly
    ? 'Display only — never filled in'
    : count === 0
      ? undefined
      : `Missing required fields: ${missing!.map((field) => field.title).join(', ')}`;
  return (
    <TabsTrigger
      value={name}
      data-variant-name={name}
      title={description}
      {...(description !== undefined && { 'aria-describedby': descriptionId })}
    >
      {variantLabel(name)}
      {displayOnly && (
        <span
          data-slot="variant-display-only"
          aria-hidden="true"
          className="rounded-sm bg-muted px-1 text-[0.625rem] text-muted-foreground"
        >
          Display only
        </span>
      )}
      {count > 0 && (
        <span
          data-slot="variant-problems"
          aria-hidden="true"
          className="inline-flex items-center gap-0.5 text-warning-text"
        >
          <Icon path={mdiAlertOutline} size="12px" />
          {count}
        </span>
      )}
      {description !== undefined && (
        <span id={descriptionId} hidden>
          {description}
        </span>
      )}
    </TabsTrigger>
  );
}

function DeleteVariantDialog({
  name,
  onClose,
  onConfirm,
}: {
  name: string | null;
  onClose: () => void;
  onConfirm: (name: string) => void;
}) {
  // Held while the dialog animates closed, so its text never blanks.
  const [shown, setShown] = useState(name);
  if (name !== null && name !== shown) setShown(name);
  return (
    <AlertDialog
      open={name !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent data-slot="variant-delete-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete the “{shown}” variant?</AlertDialogTitle>
          <AlertDialogDescription>
            Its layout is deleted. The fields and every other variant are unchanged.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              if (name !== null) onConfirm(name);
            }}
          >
            Delete variant
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

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
import { useState } from 'react';
import { LOCKED, type Governance } from '../capabilities/governance';
import type { DocumentContent } from '../document-types';
import { gridShrinkPlan, type GridShrinkPlan } from './grid-fields';
import type { InspectorTarget } from './inspector-target';

/** "<a>", "<a> and <b>", "<a>, <b> and <c>" — each name quoted. */
export function listOf(names: readonly string[]): string {
  const quoted = names.map((name) => `"${name}"`);
  return quoted.length < 2
    ? (quoted[0] ?? '')
    : `${quoted.slice(0, -1).join(', ')} and ${quoted.at(-1) ?? ''}`;
}

/**
 * Asks before a Grid resize deletes the elements outside its new size (doc 260 rule 25). Cancel, Escape or the backdrop
 * delete nothing; `names` are kept while the dialog animates closed.
 */
export function GridShrinkDialog({
  names,
  onConfirm,
  onCancel,
}: {
  /** The elements the resize deletes; `null` while nothing is pending. */
  names: readonly string[] | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [shown, setShown] = useState(names);
  if (names !== null && names !== shown) setShown(names);
  const count = shown?.length ?? 0;
  return (
    <AlertDialog
      open={names !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{`Remove ${count} element${count === 1 ? '' : 's'}?`}</AlertDialogTitle>
          <AlertDialogDescription>
            {`${listOf(shown ?? [])} ${count === 1 ? 'is' : 'are'} outside the new grid and will be deleted.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * The inspector's gate for Grid resizes (doc 260 rules 25-26): `write` applies the form's values at once unless they
 * delete elements — then the dialog asks first, or, when the template forbids one of those deletes, the values are
 * refused (`refused` says why) and the form is `reset` to the document.
 */
export function useGridShrinkGate(
  apply: (values: Record<string, unknown>) => void,
  reset: () => void,
) {
  const [pending, setPending] = useState<{
    plan: GridShrinkPlan;
    values: Record<string, unknown>;
  } | null>(null);
  const [refused, setRefused] = useState<string | null>(null);
  const write = (
    content: DocumentContent,
    target: InspectorTarget,
    values: Record<string, unknown>,
    governance: Governance | undefined,
  ) => {
    const plan = gridShrinkPlan(content, target, values, governance);
    if (plan === undefined) {
      setRefused(null);
      apply(values);
    } else if (plan.locked) {
      setRefused(`${LOCKED}: ${listOf(plan.names)} can't be deleted.`);
      reset();
    } else setPending({ plan, values });
  };
  const dialog = (
    <GridShrinkDialog
      names={pending?.plan.names ?? null}
      onConfirm={() => {
        if (pending !== null) apply(pending.values);
        setPending(null);
      }}
      onCancel={() => {
        setPending(null);
        reset();
      }}
    />
  );
  return { write, refused, dialog };
}

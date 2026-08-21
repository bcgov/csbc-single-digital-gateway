import { FormRunner } from '@repo/react/form-runner';
import {
  categoriesOf,
  FlowActionProvider,
  FlowStepProvider,
  isFlowVariant,
  resolveStepIndex,
} from '@repo/react/jsonforms-renderers';
import { scopedSchema, type UiElement } from '@repo/react/uischema-edit';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { updateDraft } from '@/lib/services';
import { UnsavedChangesGuard } from '@/components/console/unsaved-changes-guard';
import type { SectionEditorProps } from './editors';

const childrenOf = (element: UiElement): UiElement[] =>
  Array.isArray(element.elements) ? (element.elements as UiElement[]) : [];

/**
 * True when this window's content is a single flow-variant `Categorization` (feature 176).
 *
 * The flow layout draws its OWN pinned Back / Save & next / Save & exit bar, so the window must not
 * also hand `FormRunner` an `onSubmit` — that would stack a second action row underneath. Detected
 * on the subtree rather than configured, so opting a section into the flow is still a one-key
 * uischema edit with no console change.
 */
const isFlowSubtree = (elements: readonly UiElement[]): boolean =>
  elements.length === 1 && isFlowVariant(elements[0]);

/**
 * The `options.edit: true` editor — the marked element's own children, rendered editable.
 *
 * The element's CHILDREN are handed to `FormRunner`, not the element itself, so a `Group`'s own
 * `<h2>` isn't repeated under the window's title (and, since the editable renderer set shares the
 * same layout components, so the element can't render its own Edit button inside the window).
 *
 * The schema is pruned by `scopedSchema` — `FormRunner` validates with `ValidateAndShow` and
 * disables Submit while any error stands, so the unpruned service schema would block this window
 * on some *other* section's empty required field.
 *
 * `updateDraft` REPLACES `data` wholesale, so the whole merged object is sent: JSONForms preserves
 * the keys absent from this window's uischema, which is what keeps the other sections intact.
 * Drafts are saved unvalidated; `publish` runs the full Ajv pass.
 *
 * **Two save surfaces, never both (feature 176).** A flow-variant `Categorization` owns its own
 * pinned save bar, so this window mounts a `FlowActionProvider` and OMITS `onSubmit` — `FormRunner`
 * already treats an absent `onSubmit` as no-submit (preview) mode, so its own Submit button and its
 * whole-page error gate simply stop rendering. Everything else keeps the original Submit path.
 *
 * **The step lives in the URL, and nothing is lost silently (feature 177).** This component owns
 * the three things that need each other: which steps exist, what has changed since the last save,
 * and the save itself. So it mounts the step port, keeps the address honest, and guards navigation
 * away — including a step jump, which IS a navigation now.
 */
export function SubtreeSectionEditor({
  section,
  schema,
  serviceId,
  version,
  onClose,
  step,
}: SectionEditorProps) {
  const queryClient = useQueryClient();
  const elements = childrenOf(section.element);
  const flow = isFlowSubtree(elements);

  // Seed DURING render, ref-keyed on the version id. A post-commit effect would let JSONForms'
  // debounced mount emit clobber the seeded data on a warm-cache navigation (memory
  // `jsonforms-warm-cache-seed-during-render`).
  const seeded = useRef<string | null>(null);
  const [data, setData] = useState<Record<string, unknown>>(version.data);
  // The guard reads these at BLOCK time, not render time — see `dirty` below.
  const dataRef = useRef<Record<string, unknown>>(version.data);
  const baselineRef = useRef<string>(JSON.stringify(version.data));
  const dirtyRef = useRef(false);
  if (seeded.current !== version.id) {
    seeded.current = version.id;
    setData(version.data);
    dataRef.current = version.data;
    baselineRef.current = JSON.stringify(version.data);
    dirtyRef.current = false;
  }

  // Set while the unsaved-changes dialog is doing the saving, so the non-flow path doesn't ALSO
  // close the window — the blocked navigation the dialog is about to resume is the one that wins.
  const savingToLeave = useRef(false);
  const [blocked, setBlocked] = useState(false);

  const save = useMutation({
    mutationFn: (next: Record<string, unknown>) =>
      updateDraft(serviceId, version.id, { data: next }),
    onSuccess: async (_result, next) => {
      // Cleared SYNCHRONOUSLY, before any await: the flow layout navigates in the continuation
      // right after `onSave` resolves, and a still-dirty flag there would prompt the user to
      // discard the changes they just saved (the data-flow analysis' HIGH issue).
      baselineRef.current = JSON.stringify(next);
      dirtyRef.current = false;
      await queryClient.invalidateQueries({ queryKey: ['services'] });
      // The plain Submit path closes on save; the flow path must NOT — "Save & next" saves and
      // stays in the window, and only "Save & exit" closes it (through `onExit` below).
      if (!flow && !savingToLeave.current) {
        onClose();
      }
    },
  });

  const handleChange = (next: Record<string, unknown>) => {
    dataRef.current = next;
    // VALUE comparison against the last persisted data, not a touched flag: `@jsonforms/react`
    // emits a debounced onChange on mount, which would otherwise mark every window dirty on open.
    dirtyRef.current = JSON.stringify(next) !== baselineRef.current;
    setData(next);
  };

  // Stable for the lifetime of the editor, so the blocker registers once and never re-registers on
  // a keystroke.
  const dirty = useCallback(() => dirtyRef.current, []);

  /**
   * Throw the unsaved edits away and put the LAST PERSISTED data back.
   *
   * Unmounting used to do this for free — every guarded navigation left the editor. A flow step
   * jump doesn't: it is a route change within this same mounted component, so a discard that only
   * let the navigation through would leave the discarded values in the form and the dirty flag up,
   * and the next step jump would prompt all over again.
   */
  const discard = () => {
    const persisted = JSON.parse(baselineRef.current) as Record<string, unknown>;
    dataRef.current = persisted;
    dirtyRef.current = false;
    setData(persisted);
  };

  const saveFromDialog = async () => {
    savingToLeave.current = true;
    try {
      await save.mutateAsync(dataRef.current);
    } finally {
      savingToLeave.current = false;
    }
  };

  /**
   * MEMOIZED, and that is load-bearing — not a micro-optimisation.
   *
   * `@jsonforms/react` re-dispatches `updateCore(data, schema, uischema)` whenever any of those
   * three props change IDENTITY, and its `onChange` is debounced ~10ms. So a fresh `definition`
   * object built during a re-render that lands inside that window resets the form's core back to
   * the parent's `data` — silently throwing away the edit that was still in flight. It showed up as
   * "Add question block does nothing": adding an empty FAQ item raises a per-item validation error,
   * the flow layout reports it through `onBlockedChange`, the resulting `setBlocked` re-render
   * rebuilt this object, and the new row vanished before it could be committed.
   *
   * `schema` and `elements` both come from the query cache by reference, so this is stable for the
   * life of the editor.
   */
  const definition = useMemo(
    () => ({
      schema: scopedSchema(schema, elements),
      // A flow subtree is a SINGLE Categorization, so it is passed as the uischema root rather
      // than wrapped: the wrapper's `VerticalLayout` renderer is an auto-height div, and an
      // auto-height ancestor is exactly what stops the flow layout's `h-full` from resolving —
      // its internal scroll region would collapse and the page would grow instead.
      uischema: flow
        ? (elements[0] as Record<string, unknown>)
        : { type: 'VerticalLayout', elements },
    }),
    [schema, elements, flow],
  );

  // The steps this window has, and which one the address currently names.
  const steps = useMemo(
    () => (flow && elements[0] !== undefined ? categoriesOf(elements[0]) : []),
    [flow, elements],
  );
  const activeStepId = steps[resolveStepIndex(steps, step?.id ?? null)]?.id;

  // Keep the address honest, in both directions: a bare URL gains the step it is actually showing,
  // an unknown id is corrected to the resolved one, and a step segment pointing at a section with
  // no steps is cleared. Idempotent — it only fires on a mismatch — and it runs on mount, when
  // nothing is dirty, so it can never trip the guard.
  useEffect(() => {
    if (step === undefined) {
      return;
    }
    if (activeStepId === undefined) {
      if (step.id !== null) {
        step.go(undefined, { replace: true });
      }
      return;
    }
    if (step.id !== activeStepId) {
      step.go(activeStepId, { replace: true });
    }
  }, [step, activeStepId]);

  if (elements.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This section has no fields to edit. Give it an editor with{' '}
        <code>options.edit: {'{ "editor": "…" }'}</code> in the document type definition.
      </p>
    );
  }

  const runner = (
    <FormRunner
      kind="basic-form"
      definition={definition}
      data={data}
      onChange={handleChange}
      // Flow sections own an internal scroll region, so hand the runner a definite height box.
      fill={flow}
      // The flow layout owns saving; handing FormRunner an onSubmit here would stack a second bar.
      {...(flow ? {} : { onSubmit: (next: Record<string, unknown>) => save.mutate(next) })}
      submitting={save.isPending}
      submitLabel="Save"
    />
  );

  const withFlowPorts = (children: ReactNode): ReactNode =>
    flow ? (
      <FlowActionProvider
        value={{
          // `mutateAsync` REJECTS on failure, which is exactly the contract the flow bar wants:
          // it awaits this before navigating, so a failed save leaves the user on the step with
          // the error above still rendered.
          onSave: async (next) => {
            await save.mutateAsync(next);
          },
          onExit: onClose,
          saving: save.isPending,
        }}
      >
        {step === undefined ? (
          children
        ) : (
          <FlowStepProvider
            value={{
              stepId: activeStepId ?? null,
              onStepChange: (nextStepId) => step.go(nextStepId),
              onBlockedChange: setBlocked,
            }}
          >
            {children}
          </FlowStepProvider>
        )}
      </FlowActionProvider>
    ) : (
      children
    );

  return (
    <div className={flow ? 'flex h-full min-h-0 flex-col gap-4' : 'flex flex-col gap-4'}>
      {/* Leaving with unsaved edits prompts — and since the step is in the URL, a step jump is a
          navigation and is guarded by the same blocker. Save is offered here, gated by the same
          per-step rule the flow's own bar uses. */}
      <UnsavedChangesGuard
        when={dirty}
        onSave={saveFromDialog}
        onDiscard={discard}
        saveDisabled={flow && blocked}
        saveDisabledReason="This step has a validation error, so it can’t be saved yet."
      />
      {save.isError ? (
        <p className="text-sm text-destructive" role="alert">
          {save.error instanceof Error ? save.error.message : 'This section couldn’t be saved.'}
        </p>
      ) : null}
      {withFlowPorts(runner)}
    </div>
  );
}

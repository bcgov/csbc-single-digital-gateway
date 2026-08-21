import { FormRunner } from '@repo/react/form-runner';
import { FlowActionProvider, isFlowVariant } from '@repo/react/jsonforms-renderers';
import { scopedSchema, type UiElement } from '@repo/react/uischema-edit';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { updateDraft } from '@/lib/services';
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
 */
export function SubtreeSectionEditor({
  section,
  schema,
  serviceId,
  version,
  onClose,
}: SectionEditorProps) {
  const queryClient = useQueryClient();
  const elements = childrenOf(section.element);
  const flow = isFlowSubtree(elements);

  // Seed DURING render, ref-keyed on the version id. A post-commit effect would let JSONForms'
  // debounced mount emit clobber the seeded data on a warm-cache navigation (memory
  // `jsonforms-warm-cache-seed-during-render`).
  const seeded = useRef<string | null>(null);
  const [data, setData] = useState<Record<string, unknown>>(version.data);
  if (seeded.current !== version.id) {
    seeded.current = version.id;
    setData(version.data);
  }

  const save = useMutation({
    mutationFn: (next: Record<string, unknown>) =>
      updateDraft(serviceId, version.id, { data: next }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['services'] });
      // The plain Submit path closes on save; the flow path must NOT — "Save & next" saves and
      // stays in the window, and only "Save & exit" closes it (through `onExit` below).
      if (!flow) {
        onClose();
      }
    },
  });

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
      definition={{
        schema: scopedSchema(schema, elements),
        // A flow subtree is a SINGLE Categorization, so it is passed as the uischema root rather
        // than wrapped: the wrapper's `VerticalLayout` renderer is an auto-height div, and an
        // auto-height ancestor is exactly what stops the flow layout's `h-full` from resolving —
        // its internal scroll region would collapse and the page would grow instead.
        uischema: flow
          ? (elements[0] as Record<string, unknown>)
          : { type: 'VerticalLayout', elements },
      }}
      data={data}
      onChange={setData}
      // Flow sections own an internal scroll region, so hand the runner a definite height box.
      fill={flow}
      // The flow layout owns saving; handing FormRunner an onSubmit here would stack a second bar.
      {...(flow ? {} : { onSubmit: (next: Record<string, unknown>) => save.mutate(next) })}
      submitting={save.isPending}
      submitLabel="Save"
    />
  );

  return (
    <div className={flow ? 'flex h-full min-h-0 flex-col gap-4' : 'flex flex-col gap-4'}>
      {save.isError ? (
        <p className="text-sm text-destructive" role="alert">
          {save.error instanceof Error ? save.error.message : 'This section couldn’t be saved.'}
        </p>
      ) : null}
      {flow ? (
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
          {runner}
        </FlowActionProvider>
      ) : (
        runner
      )}
    </div>
  );
}

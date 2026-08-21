import { FormRunner } from '@repo/react/form-runner';
import { scopedSchema, type UiElement } from '@repo/react/uischema-edit';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { updateDraft } from '@/lib/services';
import type { SectionEditorProps } from './editors';

const childrenOf = (element: UiElement): UiElement[] =>
  Array.isArray(element.elements) ? (element.elements as UiElement[]) : [];

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
      onClose();
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

  return (
    <div className="flex flex-col gap-4">
      {save.isError ? (
        <p className="text-sm text-destructive" role="alert">
          {save.error instanceof Error ? save.error.message : 'This section couldn’t be saved.'}
        </p>
      ) : null}
      <FormRunner
        kind="basic-form"
        definition={{
          schema: scopedSchema(schema, elements),
          uischema: { type: 'VerticalLayout', elements },
        }}
        data={data}
        onChange={setData}
        onSubmit={(next) => save.mutate(next)}
        submitting={save.isPending}
        submitLabel="Save"
      />
    </div>
  );
}

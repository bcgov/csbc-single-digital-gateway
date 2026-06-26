import { Button } from '@repo/ui/button';
import { Input } from '@repo/ui/input';
import { Label } from '@repo/ui/label';
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from '@repo/ui/native-select';
import { PencilRuler, Plus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { EMPTY_FORM_DEFINITION, FormBuilderDialog } from '@/components/form-builder/builder-dialog';
import { StageBuilderDialog } from '@/components/stage-builder/stage-builder-dialog';
import { emptyDefinition, type MultiStageDefinition } from '@/components/stage-builder/stage-model';
import type { FormCatalogEntry, FormDefinition, FormType } from '@/lib/services';

/** Client-side state for one application row. `id` present = an existing reference (edit mode). */
export interface ApplicationItem {
  key: string;
  id?: string | undefined;
  label: string;
  position: number;
  mode: 'existing' | 'new';
  versionId?: string | undefined;
  newTypeId?: string | undefined;
  newTitle?: string | undefined;
  /** Builder-authored definition for a new form (client-first; persisted on service save). Either a
   * basic-form `{schema,uischema}` or a multi-stage `{stages,edges}` blob, by the chosen type's kind. */
  definition?: object | undefined;
}

/** True when a new-application type is a multi-stage form (→ stage builder, not form builder). */
const isMultiStage = (item: ApplicationItem, formTypes: FormType[]): boolean =>
  formTypes.find((t) => t.typeId === item.newTypeId)?.kind === 'multi-stage-form';

// Order is the array order; `position` is re-derived from the index on save (see service-editor).
const selectValue = (item: ApplicationItem) =>
  item.mode === 'existing' ? `existing:${item.versionId ?? ''}` : `new:${item.newTypeId ?? ''}`;

export function ApplicationsEditor({
  items,
  onChange,
  forms,
  formTypes,
  disabled = false,
}: {
  items: ApplicationItem[];
  onChange: (items: ApplicationItem[]) => void;
  forms: FormCatalogEntry[];
  formTypes: FormType[];
  disabled?: boolean;
}) {
  const nextKey = useRef(0);
  const [designingKey, setDesigningKey] = useState<string | null>(null);
  const designing = items.find((item) => item.key === designingKey) ?? null;

  const update = (key: string, patch: Partial<ApplicationItem>) =>
    onChange(items.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  const remove = (key: string) => onChange(items.filter((item) => item.key !== key));
  const add = () => {
    nextKey.current += 1;
    onChange([
      ...items,
      {
        key: `new-${nextKey.current}`,
        label: '',
        position: items.length,
        mode: forms[0] ? 'existing' : 'new',
        versionId: forms[0]?.versionId,
        newTypeId: formTypes[0]?.typeId,
      },
    ]);
  };

  const onFormSelect = (item: ApplicationItem, value: string) => {
    // Changing the form clears any existing reference id (the old reference is dropped, a new one added).
    if (value.startsWith('existing:')) {
      update(item.key, {
        mode: 'existing',
        versionId: value.slice('existing:'.length),
        id: undefined,
      });
    } else {
      update(item.key, { mode: 'new', newTypeId: value.slice('new:'.length), id: undefined });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Applications</span>
        <Button size="xs" variant="outline" type="button" disabled={disabled} onClick={add}>
          <Plus className="size-3.5" aria-hidden />
          Add application
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No applications yet — add a form a user can apply through.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.key} className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`form-${item.key}`}>Form</Label>
                  <NativeSelect
                    id={`form-${item.key}`}
                    value={selectValue(item)}
                    disabled={disabled}
                    onChange={(event) => onFormSelect(item, event.target.value)}
                  >
                    <NativeSelectOptGroup label="Existing forms">
                      {forms.map((form) => (
                        <NativeSelectOption
                          key={form.versionId}
                          value={`existing:${form.versionId}`}
                        >
                          {form.title}
                        </NativeSelectOption>
                      ))}
                    </NativeSelectOptGroup>
                    <NativeSelectOptGroup label="Create new">
                      {formTypes.map((type) => (
                        <NativeSelectOption key={type.typeId} value={`new:${type.typeId}`}>
                          New {type.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelectOptGroup>
                  </NativeSelect>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`label-${item.key}`}>Button label</Label>
                  <Input
                    id={`label-${item.key}`}
                    value={item.label}
                    disabled={disabled}
                    placeholder="Apply now"
                    onChange={(event) => update(item.key, { label: event.target.value })}
                  />
                </div>
              </div>
              {item.mode === 'new' ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`new-title-${item.key}`}>New form title</Label>
                  <Input
                    id={`new-title-${item.key}`}
                    value={item.newTitle ?? ''}
                    disabled={disabled}
                    placeholder="Form title"
                    onChange={(event) => update(item.key, { newTitle: event.target.value })}
                  />
                  <Button
                    size="xs"
                    variant="outline"
                    type="button"
                    className="self-start"
                    disabled={disabled}
                    onClick={() => {
                      if (item.definition === undefined) {
                        update(item.key, {
                          definition: isMultiStage(item, formTypes)
                            ? emptyDefinition()
                            : EMPTY_FORM_DEFINITION,
                        });
                      }
                      setDesigningKey(item.key);
                    }}
                  >
                    <PencilRuler className="size-3.5" aria-hidden />
                    {item.definition ? 'Edit' : 'Design'}{' '}
                    {isMultiStage(item, formTypes) ? 'stages' : 'form'}
                  </Button>
                </div>
              ) : null}
              <div className="flex justify-end">
                <Button
                  size="xs"
                  variant="ghost"
                  type="button"
                  className="text-destructive"
                  disabled={disabled}
                  onClick={() => remove(item.key)}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {designing !== null && isMultiStage(designing, formTypes) ? (
        <StageBuilderDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setDesigningKey(null);
            }
          }}
          title={designing.newTitle ? `Design: ${designing.newTitle}` : 'Design stages'}
          value={(designing.definition as MultiStageDefinition | undefined) ?? emptyDefinition()}
          onChange={(definition) => {
            if (designingKey !== null) {
              update(designingKey, { definition });
            }
          }}
        />
      ) : (
        <FormBuilderDialog
          open={designing !== null}
          onOpenChange={(open) => {
            if (!open) {
              setDesigningKey(null);
            }
          }}
          title={designing?.newTitle ? `Design: ${designing.newTitle}` : 'Design form'}
          value={(designing?.definition as FormDefinition | undefined) ?? EMPTY_FORM_DEFINITION}
          onChange={(definition) => {
            if (designingKey !== null) {
              update(designingKey, { definition });
            }
          }}
        />
      )}
    </div>
  );
}

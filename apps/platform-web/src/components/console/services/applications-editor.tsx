import { Button } from '@repo/ui/button';
import { Input } from '@repo/ui/input';
import { Label } from '@repo/ui/label';
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from '@repo/ui/native-select';
import { Plus, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import type { FormCatalogEntry, FormType } from '@/lib/services';

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
}

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
    </div>
  );
}

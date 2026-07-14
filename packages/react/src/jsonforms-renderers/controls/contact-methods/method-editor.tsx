import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { Card, CardContent } from '@repo/ui/card';
import { Field, FieldLabel } from '@repo/ui/field';
import { Input } from '@repo/ui/input';
import { RichTextInput, type RichTextInputProps } from '@repo/ui/rich-text-input';
import { Plus, Trash2, X } from 'lucide-react';
import { useId } from 'react';
import {
  ADDRESS_FIELDS,
  CONTACT_METHOD_META,
  type AddressEntry,
  type ContactEntry,
  type ContactMethod,
  type ContactMethodType,
  type ValueEntry,
  emptyEntry,
} from './model';

/** A single labelled text input wired to a Field, with an accessible name from its label. */
function LabeledInput({
  label,
  value,
  disabled,
  type = 'text',
  onChange,
}: {
  label: string;
  value: string | undefined;
  disabled: boolean;
  type?: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type={type}
        value={value ?? ''}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

/** One entry within a method — a value row ({label, value}) or the full address field set. */
function EntryRow({
  type,
  entry,
  disabled,
  onChange,
  onRemove,
}: {
  type: ContactMethodType;
  entry: ContactEntry;
  disabled: boolean;
  onChange: (patch: Partial<ContactEntry>) => void;
  onRemove: () => void;
}) {
  const meta = CONTACT_METHOD_META[type];
  const valueLabel = meta.entry.kind === 'value' ? meta.entry.valueLabel : 'Value';
  const inputType = meta.entry.kind === 'value' ? meta.entry.inputType : 'text';
  return (
    <div className="flex items-start gap-2 rounded-md border border-border p-3">
      <div className="grid flex-1 gap-2 sm:grid-cols-2">
        {type === 'address' ? (
          ADDRESS_FIELDS.map((field) => (
            <LabeledInput
              key={field.key}
              label={field.label}
              value={(entry as AddressEntry)[field.key]}
              disabled={disabled}
              onChange={(value) => onChange({ [field.key]: value } as Partial<AddressEntry>)}
            />
          ))
        ) : (
          <>
            <LabeledInput
              label="Label"
              value={(entry as ValueEntry).label}
              disabled={disabled}
              onChange={(value) => onChange({ label: value })}
            />
            <LabeledInput
              label={valueLabel}
              type={inputType}
              value={(entry as ValueEntry).value}
              disabled={disabled}
              onChange={(value) => onChange({ value })}
            />
          </>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={disabled}
        onClick={onRemove}
        aria-label="Remove entry"
      >
        <X aria-hidden />
      </Button>
    </div>
  );
}

/** A single contact method: type badge, label, rich-text description, and its list of entries. */
export function MethodEditor({
  method,
  disabled,
  onChange,
  onRemove,
}: {
  method: ContactMethod;
  disabled: boolean;
  onChange: (patch: Partial<ContactMethod>) => void;
  onRemove: () => void;
}) {
  const labelId = useId();
  const descId = useId();
  const meta = CONTACT_METHOD_META[method.type];
  const Icon = meta.icon;
  const entries = Array.isArray(method.entries) ? method.entries : [];

  const setEntries = (next: ContactEntry[]) => onChange({ entries: next });
  const updateEntry = (index: number, patch: Partial<ContactEntry>) =>
    setEntries(entries.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  const addEntry = () => setEntries([...entries, emptyEntry(method.type)]);
  const removeEntry = (index: number) => setEntries(entries.filter((_, i) => i !== index));

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-4">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-4" aria-hidden />
          </span>
          <Badge color="grey">{meta.label}</Badge>
          <div className="flex-1" />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            onClick={onRemove}
            aria-label="Remove method"
          >
            <Trash2 aria-hidden />
          </Button>
        </div>

        <Field>
          <FieldLabel htmlFor={labelId}>Label</FieldLabel>
          <Input
            id={labelId}
            value={method.label ?? ''}
            disabled={disabled}
            onChange={(event) => onChange({ label: event.target.value })}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={descId}>Description</FieldLabel>
          <RichTextInput
            id={descId}
            value={(method.description ?? null) as Exclude<RichTextInputProps['value'], undefined>}
            disabled={disabled}
            onChange={(value) => onChange({ description: value })}
          />
        </Field>

        <div className="flex flex-col gap-2">
          {entries.map((entry, index) => (
            <EntryRow
              // Entry rows have no stable key; index is safe (no reordering).
              key={index}
              type={method.type}
              entry={entry}
              disabled={disabled}
              onChange={(patch) => updateEntry(index, patch)}
              onRemove={() => removeEntry(index)}
            />
          ))}
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={addEntry}
            >
              <Plus aria-hidden />
              {meta.entry.addEntryLabel}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

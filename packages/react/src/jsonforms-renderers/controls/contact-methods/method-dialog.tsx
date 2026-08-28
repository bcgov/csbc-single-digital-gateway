import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import { Field, FieldError, FieldLabel } from '@repo/ui/field';
import { Input } from '@repo/ui/input';
import { PhoneInput } from '@repo/ui/phone-input';
import { useId, useState } from 'react';
import {
  ADDRESS_FIELDS,
  CONTACT_METHOD_META,
  CONTACT_METHOD_TYPES,
  type ContactMethod,
  type ContactMethodType,
  isPhoneType,
} from './model';

export interface DialogState {
  open: boolean;
  /** null = adding; a number = editing that row. */
  index: number | null;
  /** null = still on the type-picker step; a method = on the form step. */
  draft: ContactMethod | null;
}

const REQUIRED_ERROR = [{ message: 'Required' }];

/** A single labelled text input, with an accessible name derived from its label. */
function LabeledInput({
  label,
  value,
  type = 'text',
  required,
  invalid,
  onChange,
}: {
  label: string;
  value: string | undefined;
  type?: string;
  required?: boolean;
  invalid?: boolean;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <Field data-invalid={invalid || undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {required ? ' *' : ''}
      </FieldLabel>
      <Input
        id={id}
        type={type}
        value={value ?? ''}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {invalid ? <FieldError id={`${id}-error`} errors={REQUIRED_ERROR} /> : null}
    </Field>
  );
}

/** A phone-number field (react-phone-number-input, CA default) for the phone/fax value. */
function PhoneField({
  label,
  value,
  required,
  invalid,
  onChange,
}: {
  label: string;
  value: string | undefined;
  required?: boolean;
  invalid?: boolean;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <Field data-invalid={invalid || undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {required ? ' *' : ''}
      </FieldLabel>
      <PhoneInput
        id={id}
        value={value}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        onChange={(next) => onChange(next ?? '')}
      />
      {invalid ? <FieldError id={`${id}-error`} errors={REQUIRED_ERROR} /> : null}
    </Field>
  );
}

/** Step 1 — pick which kind of contact method to add. */
function TypePicker({ onPick }: { onPick: (type: ContactMethodType) => void }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {CONTACT_METHOD_TYPES.map((type) => {
        const meta = CONTACT_METHOD_META[type];
        return (
          <Button
            key={type}
            type="button"
            variant="outline"
            className="h-auto justify-start gap-3 rounded-lg px-3 py-2.5 transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary/5 hover:shadow-sm"
            onClick={() => onPick(type)}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover/button:bg-primary group-hover/button:text-primary-foreground">
              <Icon path={meta.icon} size="16px" aria-hidden />
            </span>
            <span className="font-medium">{meta.label}</span>
          </Button>
        );
      })}
    </div>
  );
}

// Every contact method requires a label. Value types also require the value; address requires all
// address fields except line 2.
function requiredKeysFor(type: ContactMethodType): (keyof ContactMethod)[] {
  return type === 'address'
    ? ['label', 'address_one', 'city', 'province', 'country', 'postal_code']
    : ['label', 'value'];
}

/** Step 2 — fill/edit a single method (label + one value, or the address fields). */
function MethodForm({
  initial,
  onSave,
}: {
  initial: ContactMethod;
  onSave: (method: ContactMethod) => void;
}) {
  const [method, setMethod] = useState<ContactMethod>(initial);
  const [submitted, setSubmitted] = useState(false);
  const meta = CONTACT_METHOD_META[method.type];
  const set = (patch: Partial<ContactMethod>) => setMethod((current) => ({ ...current, ...patch }));

  const requiredKeys = requiredKeysFor(method.type);
  const isMissing = (key: keyof ContactMethod) => {
    const current = method[key];
    return typeof current !== 'string' || current.trim() === '';
  };
  const errorFor = (key: keyof ContactMethod) =>
    submitted && requiredKeys.includes(key) && isMissing(key);
  const handleSave = () => {
    if (requiredKeys.some((key) => isMissing(key))) {
      setSubmitted(true);
      return;
    }
    onSave(method);
  };

  return (
    <div className="flex flex-col gap-3">
      <LabeledInput
        label="Label"
        required
        invalid={errorFor('label')}
        value={method.label}
        onChange={(value) => set({ label: value })}
      />
      {meta.field.kind === 'value' ? (
        isPhoneType(method.type) ? (
          <PhoneField
            label={meta.field.valueLabel}
            required
            invalid={errorFor('value')}
            value={method.value}
            onChange={(value) => set({ value })}
          />
        ) : (
          <LabeledInput
            label={meta.field.valueLabel}
            type={meta.field.inputType}
            required
            invalid={errorFor('value')}
            value={method.value}
            onChange={(value) => set({ value })}
          />
        )
      ) : (
        ADDRESS_FIELDS.map((f) => {
          const isRequired = f.key !== 'address_two';
          return (
            <LabeledInput
              key={f.key}
              label={f.label}
              required={isRequired}
              invalid={errorFor(f.key)}
              value={method[f.key]}
              onChange={(value) => set({ [f.key]: value } as Partial<ContactMethod>)}
            />
          );
        })
      )}
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="ghost" />}>Cancel</DialogClose>
        <Button type="button" onClick={handleSave}>
          Save
        </Button>
      </DialogFooter>
    </div>
  );
}

/** The add/edit modal: type-picker step (when `draft` is null) then the per-type form. */
export function MethodDialog({
  state,
  onPickType,
  onSave,
  onOpenChange,
}: {
  state: DialogState;
  onPickType: (type: ContactMethodType) => void;
  onSave: (method: ContactMethod) => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {state.index === null ? 'Add contact method' : 'Edit contact method'}
          </DialogTitle>
          <DialogDescription>
            {state.draft === null
              ? 'Choose the kind of contact method to add.'
              : 'Enter the details for this contact method.'}
          </DialogDescription>
        </DialogHeader>
        {state.draft === null ? (
          <TypePicker onPick={onPickType} />
        ) : (
          <MethodForm initial={state.draft} onSave={onSave} />
        )}
      </DialogContent>
    </Dialog>
  );
}

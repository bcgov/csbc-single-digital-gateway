import { and, optionIs, rankWith, uiTypeIs } from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Button } from '@repo/ui/button';
import { Plus } from 'lucide-react';
import { ControlWrapper } from '../../util/control-wrapper';
import { MethodEditor } from './method-editor';
import {
  CONTACT_METHOD_META,
  CONTACT_METHOD_TYPES,
  type ContactMethod,
  type ContactMethodType,
  emptyMethod,
} from './model';

// Dispatched purely by the uischema option `format: 'contact-methods'` (mirrors the richtext field),
// ranked above the generic array/object controls so it wins regardless of the backing schema.
export const contactMethodsControlTester: RankedTester = rankWith(
  5,
  and(uiTypeIs('Control'), optionIs('format', 'contact-methods')),
);

function ContactMethodsControlComponent({
  id,
  data,
  handleChange,
  path,
  label,
  description,
  errors,
  required,
  enabled,
  visible,
}: ControlProps) {
  if (visible === false) {
    return null;
  }
  const methods: ContactMethod[] = Array.isArray(data) ? (data as ContactMethod[]) : [];
  const disabled = enabled === false;

  const commit = (next: ContactMethod[]) => handleChange(path, next);
  const addMethod = (type: ContactMethodType) => commit([...methods, emptyMethod(type)]);
  const removeMethod = (index: number) => commit(methods.filter((_, i) => i !== index));
  const updateMethod = (index: number, patch: Partial<ContactMethod>) =>
    commit(methods.map((method, i) => (i === index ? { ...method, ...patch } : method)));

  return (
    <ControlWrapper
      id={id}
      label={label}
      required={required}
      {...(description ? { description } : {})}
      errors={errors}
      labelFor={false}
    >
      <div className="flex flex-col gap-4">
        {methods.map((method, index) => (
          <MethodEditor
            // Contact methods have no stable key; index is safe (no reordering).
            key={index}
            method={method}
            disabled={disabled}
            onChange={(patch) => updateMethod(index, patch)}
            onRemove={() => removeMethod(index)}
          />
        ))}
        <div data-slot="add-methods" className="flex flex-wrap gap-2">
          {CONTACT_METHOD_TYPES.map((type) => {
            const meta = CONTACT_METHOD_META[type];
            return (
              <Button
                key={type}
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => addMethod(type)}
              >
                <Plus aria-hidden />
                {meta.addLabel}
              </Button>
            );
          })}
        </div>
      </div>
    </ControlWrapper>
  );
}

export const ContactMethodsControl = withJsonFormsControlProps(ContactMethodsControlComponent);

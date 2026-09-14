import type { JsonFormsCore, Layout } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { useState } from 'react';
import * as inspectorSet from '../renderers/studio-inspector/index';
import type { InspectorValues } from './inspector/inspector-fields';
import {
  inspectorErrors,
  type InspectorError,
  type InspectorForm,
} from './inspector/inspector-form';

// Built once at module load — a new array per render would make JSONForms re-dispatch everything.
const INSPECTOR_RENDERERS = [
  ...inspectorSet.controlRenderers,
  ...inspectorSet.displayRenderers,
  ...inspectorSet.layoutRenderers,
];

const EMPTY_MESSAGE = 'Select an element to configure it.';
const NO_SETTINGS_MESSAGE = 'This element has no settings.';

export interface StudioInspectorProps {
  readonly elementId: string | null;
  /** The selected element's label (`elementLabel`, doc 186). */
  readonly label: string;
  readonly form: InspectorForm | undefined;
  onChange(elementId: string, values: InspectorValues): void;
}

interface InspectorBodyProps extends Omit<StudioInspectorProps, 'elementId' | 'form'> {
  readonly elementId: string;
  readonly form: InspectorForm;
}

/** Only a change in the cross-field errors yields a new array — a new `additionalErrors` re-emits onChange. */
const sameErrors = (a: readonly InspectorError[], b: readonly InspectorError[]) =>
  a.length === b.length && a.every((error, index) => error.instancePath === b[index]?.instancePath);

function InspectorBody({ elementId, label, form, onChange }: InspectorBodyProps) {
  const [errors, setErrors] = useState(() => inspectorErrors(form.data));
  const hasSettings = ((form.uischema as Layout).elements ?? []).length > 0;

  const handleChange = ({ data }: Pick<JsonFormsCore, 'data'>) => {
    const values = data as InspectorValues;
    const next = inspectorErrors(values);
    setErrors((current) => (sameErrors(current, next) ? current : next));
    onChange(elementId, values);
  };

  return (
    <>
      <header className="flex flex-col gap-0.5">
        <h2 className="text-sm font-bold">{label}</h2>
        <p className="text-xs text-muted-foreground">{form.elementType}</p>
      </header>
      {hasSettings ? (
        <JsonForms
          schema={form.schema}
          uischema={form.uischema}
          data={form.data}
          renderers={INSPECTOR_RENDERERS}
          cells={inspectorSet.cells}
          additionalErrors={errors}
          onChange={handleChange}
        />
      ) : (
        <p className="text-sm text-muted-foreground">{NO_SETTINGS_MESSAGE}</p>
      )}
    </>
  );
}

/**
 * The Form Studio inspector (doc 187 rules 23-24): the selected element's settings as a JSONForms form
 * rendered by `renderers/studio-inspector`, writing every change straight back through `onChange`. The body
 * is keyed by element id, so selecting another element remounts it. `data-studio-inspector` also keeps
 * Escape typed here from walking the selection (rule 29).
 */
export function StudioInspector({ elementId, label, form, onChange }: StudioInspectorProps) {
  return (
    <div data-studio-inspector="" className="flex flex-col gap-3 p-2">
      {elementId === null || form === undefined ? (
        <p className="text-sm text-muted-foreground">{EMPTY_MESSAGE}</p>
      ) : (
        <InspectorBody
          key={elementId}
          elementId={elementId}
          label={label}
          form={form}
          onChange={onChange}
        />
      )}
    </div>
  );
}

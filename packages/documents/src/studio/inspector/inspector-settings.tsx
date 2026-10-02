import { JsonForms } from '@jsonforms/react';
import type { ErrorObject } from 'ajv';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DocumentContent } from '../document-types';
import { applyInspector } from './apply-inspector';
import { fieldsFor, inspectorForm, type InspectorForm } from './inspector-form';
import { INSPECTOR_RENDERERS } from './inspector-renderers';
import {
  inspectorTarget,
  KIND_NAMES,
  type InspectorTarget,
  type TargetInputs,
} from './inspector-target';

export interface InspectorSettingsProps extends TargetInputs {
  content: DocumentContent;
  /** Called with the edited content — never on mount, never for an edit that changes nothing (doc 249 rule 13). */
  onContentChange: (content: DocumentContent) => void;
}

/** The inspector's Settings view (doc 249): the inspected element's target line and its editable properties. */
export function InspectorSettings({
  content,
  pageSelectedId,
  focusedId,
  formId,
  onContentChange,
}: InspectorSettingsProps) {
  const target = useMemo(
    () => inspectorTarget(content, { pageSelectedId, focusedId, formId }),
    [content, pageSelectedId, focusedId, formId],
  );
  if (target === null) return <Message>Nothing to inspect.</Message>;
  return (
    <div data-slot="inspector-settings" className="flex flex-col gap-2">
      <TargetLine target={target} />
      {/* Keyed by the element: another selection remounts the form, typing never does (rule 16). */}
      <TargetForm
        key={target.id}
        target={target}
        content={content}
        onContentChange={onContentChange}
      />
    </div>
  );
}

/** Rule 5 and 10: kind, name and how many fields share the property. */
function TargetLine({ target }: { target: InspectorTarget }) {
  const shared = target.property?.shared ?? 0;
  const parts = [
    KIND_NAMES[target.kind],
    target.name,
    shared > 1 ? `shared by ${shared} fields` : undefined,
  ];
  return (
    <p data-slot="inspector-target" className="truncate text-xs font-medium">
      {parts.filter((part) => part !== undefined).join(' · ')}
    </p>
  );
}

function TargetForm({
  target,
  content,
  onContentChange,
}: {
  target: InspectorTarget;
  content: DocumentContent;
  onContentChange: (content: DocumentContent) => void;
}) {
  const view = useMemo(() => inspectorForm(target), [target]);
  const own = useRef<DocumentContent | null>(null);
  const props = useFormProps(view, content, own.current);
  // JSONForms emits after a debounce, so the handler reads the LATEST content and target — and nothing once this
  // instance is gone, or an old selection's last emit would be applied over the new one.
  const latest = useRef({ target, content, onContentChange, mounted: true });
  latest.current = { target, content, onContentChange, mounted: true };
  useEffect(() => {
    const current = latest;
    current.current.mounted = true;
    return () => {
      current.current.mounted = false;
    };
  }, []);
  const [errors, setErrors] = useState<string[]>([]);
  if (view.empty) return <Message>No properties to edit.</Message>;
  return (
    <>
      <JsonForms
        schema={props.schema}
        uischema={props.uischema as never}
        data={props.data}
        renderers={INSPECTOR_RENDERERS}
        onChange={({ data, errors: found }) => {
          const current = latest.current;
          if (!current.mounted) return;
          const messages = errorMessages(current.target, found ?? []);
          setErrors((shown) => (shown.join('\n') === messages.join('\n') ? shown : messages));
          const next = applyInspector(
            current.content,
            current.target,
            data as Record<string, unknown>,
          );
          if (next === current.content) return;
          own.current = next;
          current.onContentChange(next);
        }}
      />
      {errors.length > 0 && (
        <ul role="alert" data-slot="inspector-errors" className="text-xs text-destructive">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * What `<JsonForms>` is given (doc 249 rule 16). JSONForms resets its state whenever a prop's identity changes, and
 * its emits are debounced, so handing back the data rebuilt from its OWN last write lands after the author has typed
 * on, and eats those keys. So: schema and uischema keep their identity until the field set changes, and data is only
 * replaced when the content changed elsewhere (a canvas edit, the other panel) or the field set changed.
 */
function useFormProps(view: InspectorForm, content: DocumentContent, own: DocumentContent | null) {
  const [props, setProps] = useState({ ...view, content });
  if (props.content === content) return props;
  const reshaped = structure(props) !== structure(view);
  const next = {
    schema: reshaped ? view.schema : props.schema,
    uischema: reshaped ? view.uischema : props.uischema,
    data: reshaped || content !== own ? view.data : props.data,
    empty: view.empty,
    content,
  };
  setProps(next);
  return next;
}

/** A form's field set, as text: what decides whether JSONForms must be given a new schema and uischema. */
const structure = (form: InspectorForm) => JSON.stringify([form.schema, form.uischema]);

/**
 * Why a value was not written (doc 249 rule 8), one line per field: the ui controls show no validation errors, so the
 * inspector lists them under its form.
 */
function errorMessages(target: InspectorTarget, errors: readonly ErrorObject[]): string[] {
  const labels = new Map(fieldsFor(target).map((field) => [`/${field.key}`, field.label]));
  const lines = errors.flatMap((error) => {
    const label = labels.get(error.instancePath);
    return label === undefined ? [] : [`${label} ${error.message ?? 'is not valid'}.`];
  });
  return [...new Set(lines)];
}

function Message({ children }: { children: string }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

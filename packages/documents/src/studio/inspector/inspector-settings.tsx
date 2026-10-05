import type { Governance } from '../capabilities/governance';
import { JsonForms } from '@jsonforms/react';
import type { ErrorObject } from 'ajv';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DocumentContent } from '../document-types';
import { applyInspector } from './apply-inspector';
import { useGridShrinkGate } from './grid-shrink-dialog';
import { fieldsFor, inspectorForm, type InspectorForm } from './inspector-form';
import { InspectorOptions } from '../options/inspector-options';
import { InspectorRule } from '../rules/inspector-rule';
import { optionsTargetOf } from '../options/options-target';
import { InspectorCapabilities } from '../capabilities/inspector-capabilities';
import { INSPECTOR_RENDERERS } from './inspector-renderers';
import { InspectorHeader } from './property-key';
import { keyProblem, renamePropertyKey } from './property-rename';
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
  /** Opens the options editor for a choice field (doc 255 rule 2); absent: no Options section. */
  onEditOptions?: ((elementId: string) => void) | undefined;
  /** Opens the rule dialog for a page element (doc 256 rule 13); absent: no Rule section. */
  onEditRule?: ((elementId: string) => void) | undefined;
  /** The document is a template: show the Implementation Rules section (doc 258 rule 1). */
  templateRules?: boolean;
  /** The pinned template's rules (doc 259 rules 15-18); absent: ungoverned. */
  governance?: Governance | undefined;
}

/** The inspector's Settings view (doc 249): the inspected element's header (doc 257) and its editable properties. */
export function InspectorSettings({
  content,
  pageSelectedId,
  focusedId,
  formId,
  onContentChange,
  onEditOptions,
  onEditRule,
  templateRules = false,
  governance,
}: InspectorSettingsProps) {
  const target = useMemo(
    () => inspectorTarget(content, { pageSelectedId, focusedId, formId }),
    [content, pageSelectedId, focusedId, formId],
  );
  if (target === null) return <Message>Nothing to inspect.</Message>;
  const options = onEditOptions === undefined ? undefined : optionsTargetOf(target);
  const locked = (key: string) => governance?.canEdit(target.id, key) === false;
  return (
    <div data-slot="inspector-settings" className="flex flex-col gap-2">
      <InspectorHeader
        kind={KIND_NAMES[target.kind]}
        property={target.property}
        renameLocked={locked('key')}
        problem={(next) =>
          target.property === undefined ? undefined : keyProblem(content, target.property.key, next)
        }
        onRename={(next) => {
          if (target.property === undefined) return;
          const renamed = renamePropertyKey(content, target.property.key, next);
          if (renamed !== content) onContentChange(renamed);
        }}
      />
      {/* Keyed by the element: another selection remounts the form, typing never does (rule 16). */}
      <TargetForm
        key={target.id}
        target={target}
        content={content}
        onContentChange={onContentChange}
        governance={governance}
      />
      {/* Rules belong to page elements, never the Form or Funnel root (doc 256 rule 13). */}
      {onEditRule !== undefined && target.kind !== 'form' && target.kind !== 'funnel' && (
        <InspectorRule
          content={content}
          elementId={target.id}
          locked={locked('rule')}
          onEdit={() => onEditRule(target.id)}
        />
      )}
      {options !== undefined && (
        <InspectorOptions
          target={options}
          locked={locked('options')}
          onEdit={() => onEditOptions?.(options.elementId)}
        />
      )}
      {/* Last, on templates only, for every element with an id — the roots included (doc 258 rules 1-2). */}
      {templateRules && target.id !== '' && (
        <InspectorCapabilities
          content={content}
          target={target}
          onContentChange={onContentChange}
        />
      )}
    </div>
  );
}

function TargetForm({
  target,
  content,
  onContentChange,
  governance,
}: {
  target: InspectorTarget;
  content: DocumentContent;
  onContentChange: (content: DocumentContent) => void;
  governance: Governance | undefined;
}) {
  const view = useMemo(() => inspectorForm(target, governance), [target, governance]);
  const own = useRef<DocumentContent | null>(null);
  const { props, reset } = useFormProps(view, content, own.current);
  // JSONForms emits after a debounce, so the handler reads the LATEST content and target — and nothing once this
  // instance is gone, or an old selection's last emit would be applied over the new one.
  const latest = useRef({ target, content, onContentChange, governance, mounted: true });
  latest.current = { target, content, onContentChange, governance, mounted: true };
  useEffect(() => {
    const current = latest;
    current.current.mounted = true;
    return () => {
      current.current.mounted = false;
    };
  }, []);
  const [errors, setErrors] = useState<string[]>([]);
  const apply = (values: Record<string, unknown>) => {
    const current = latest.current;
    const next = applyInspector(current.content, current.target, values, current.governance);
    if (next === current.content) return;
    own.current = next;
    current.onContentChange(next);
  };
  // Doc 260 rules 25-26: a Grid resize that deletes elements waits for the author; a locked one is refused.
  const shrinkGate = useGridShrinkGate(apply, reset);
  if (view.empty) return <Message>No properties to edit.</Message>;
  return (
    <>
      <JsonForms
        key={props.nonce}
        schema={props.schema}
        uischema={props.uischema as never}
        data={props.data}
        renderers={INSPECTOR_RENDERERS}
        onChange={({ data, errors: found }) => {
          const current = latest.current;
          if (!current.mounted) return;
          const messages = errorMessages(current.target, found ?? []);
          setErrors((shown) => (shown.join('\n') === messages.join('\n') ? shown : messages));
          shrinkGate.write(
            current.content,
            current.target,
            data as Record<string, unknown>,
            current.governance,
          );
        }}
      />
      {(errors.length > 0 || shrinkGate.refused !== null) && (
        <ul role="alert" data-slot="inspector-errors" className="text-xs text-destructive">
          {[...errors, ...(shrinkGate.refused === null ? [] : [shrinkGate.refused])].map(
            (message) => (
              <li key={message}>{message}</li>
            ),
          )}
        </ul>
      )}
      {shrinkGate.dialog}
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
  const [props, setProps] = useState({ ...view, content, nonce: 0 });
  // Doc 260 rule 25: a refused or cancelled value goes back to what the document holds — a fresh form, remounted.
  const reset = () => setProps({ ...view, content, nonce: props.nonce + 1 });
  if (props.content === content) return { props, reset };
  const reshaped = structure(props) !== structure(view);
  const next = {
    schema: reshaped ? view.schema : props.schema,
    uischema: reshaped ? view.uischema : props.uischema,
    data: reshaped || content !== own ? view.data : props.data,
    empty: view.empty,
    content,
    nonce: props.nonce,
  };
  setProps(next);
  return { props: next, reset };
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

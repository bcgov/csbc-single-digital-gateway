import {
  rankWith,
  uiTypeIs,
  type JsonFormsRendererRegistryEntry,
  type Layout,
  type LayoutProps,
} from '@jsonforms/core';
import { JsonForms, JsonFormsDispatch, withJsonFormsLayoutProps } from '@jsonforms/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DocumentContent } from '../document-types';
import { FoldableSection } from '../foldable-section';
import { INSPECTOR_RENDERERS, SECTION_CLASSES } from '../inspector/inspector-renderers';
import type { InspectorTarget } from '../inspector/inspector-target';
import { applyCapabilities, capabilityForm, type CapabilityForm } from './capability-fields';
import { withCapabilities } from './capability-edits';

// Doc 258 rules 1-9 — the template-only Implementation Rules section, drawn OUTSIDE the element form (the doc 255 /
// 256 pattern): its values write `content.capabilities`, never the element or the schema.

/** A group ("This element" / "Its contents"): a sub-heading over its rows, never a foldable section of its own. */
function CapabilityGroup({
  uischema,
  schema,
  path,
  enabled,
  renderers,
  cells,
  label,
}: LayoutProps) {
  return (
    <div data-slot="capability-group" className="flex flex-col gap-1">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      {((uischema as Layout).elements ?? []).map((child, index) => (
        <JsonFormsDispatch
          key={index}
          uischema={child}
          schema={schema}
          path={path}
          enabled={enabled}
          {...(renderers && { renderers })}
          {...(cells && { cells })}
        />
      ))}
    </div>
  );
}

const RENDERERS: JsonFormsRendererRegistryEntry[] = [
  ...INSPECTOR_RENDERERS,
  { tester: rankWith(2, uiTypeIs('Group')), renderer: withJsonFormsLayoutProps(CapabilityGroup) },
];

export function InspectorCapabilities({
  content,
  target,
  onContentChange,
}: {
  content: DocumentContent;
  target: InspectorTarget;
  onContentChange: (content: DocumentContent) => void;
}) {
  return (
    <FoldableSection
      name="Implementation Rules"
      {...SECTION_CLASSES}
      className={`${SECTION_CLASSES.className} mt-2`}
    >
      {/* Keyed by the element: another selection remounts with that element's entry as stored NOW (rule 9). */}
      <CapabilityForm
        key={target.id}
        content={content}
        target={target}
        onContentChange={onContentChange}
      />
    </FoldableSection>
  );
}

function CapabilityForm({
  content,
  target,
  onContentChange,
}: {
  content: DocumentContent;
  target: InspectorTarget;
  onContentChange: (content: DocumentContent) => void;
}) {
  // Rule 9 (Forms doc 231 B1): derived from the map on EVERY change — a memo on the element alone showed a cascaded
  // child its stale entry, and its next emit wrote that back.
  const view = useMemo(() => capabilityForm(target, content.capabilities), [target, content]);
  const own = useRef<DocumentContent | null>(null);
  const props = useStableProps(view, content, own.current);
  // JSONForms emits after a debounce: read the LATEST content and target, and nothing once unmounted.
  const latest = useRef({ target, content, onContentChange, mounted: true });
  latest.current = { target, content, onContentChange, mounted: true };
  useEffect(() => {
    const current = latest;
    current.current.mounted = true;
    return () => {
      current.current.mounted = false;
    };
  }, []);
  return (
    <JsonForms
      schema={props.schema}
      uischema={props.uischema as never}
      data={props.data}
      renderers={RENDERERS}
      onChange={({ data }) => {
        const current = latest.current;
        if (!current.mounted) return;
        const before = current.content.capabilities;
        const next = applyCapabilities(before, current.target, data as Record<string, unknown>);
        if (next === before) return;
        const written = withCapabilities(current.content, next);
        own.current = written;
        current.onContentChange(written);
      }}
    />
  );
}

/**
 * What `<JsonForms>` is given (doc 249 rule 16, restated): schema and uischema keep their identity until the field set
 * changes, and data is replaced only when the content changed somewhere other than this form's own last write.
 */
function useStableProps(
  view: CapabilityForm,
  content: DocumentContent,
  own: DocumentContent | null,
) {
  const [props, setProps] = useState({ ...view, content });
  if (props.content === content) return props;
  const reshaped = structure(props) !== structure(view);
  const next = {
    schema: reshaped ? view.schema : props.schema,
    uischema: reshaped ? view.uischema : props.uischema,
    data: reshaped || content !== own ? view.data : props.data,
    content,
  };
  setProps(next);
  return next;
}

const structure = (form: Pick<CapabilityForm, 'schema' | 'uischema'>) =>
  JSON.stringify([form.schema, form.uischema]);

import { Field, FieldLabel } from '@repo/ui/field';
import { NativeSelect, NativeSelectOption } from '@repo/ui/native-select';
import { useId } from 'react';
import type { EdgePatch } from '../renderers/xyflow/flow-gestures';
import type { EdgeChoice, EdgeInspectorModel } from './inspector/edge-fields';

// The inspector's EDGE panel (doc 209 rules 5-8). It stands beside the element form rather than inside it:
// `applyInspector` can only ever write to the SELECTED element, and an edge's data lives in the Flow's options
// (rule 6) — the same reason doc 206 rule 2 kept the option list out of the JSONForms channel.

const EDGE_HEADING = 'Connection';
const EDGE_HINT = 'Where this connection starts and ends.';

interface PickerProps {
  readonly label: string;
  readonly value: string;
  readonly choices: readonly EdgeChoice[];
  onChange(value: string): void;
}

/** One labelled picker. A NATIVE select: the panel is three short lists, and this is the app's own control. */
function EdgePicker({ label, value, choices, onChange }: PickerProps) {
  const id = useId();
  return (
    <Field>
      <FieldLabel htmlFor={id} className="text-xs">
        {label}
      </FieldLabel>
      <NativeSelect
        id={id}
        className="w-full"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {choices.map((choice) => (
          <NativeSelectOption key={choice.value} value={choice.value}>
            {choice.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </Field>
  );
}

/**
 * Rules 5-8: Source, From branch (only when the source is a Condition) and Target.
 *
 * Every change is a whole `EdgePatch` handed straight up — the panel holds NO state of its own, so a refused
 * edit needs no undo: the document did not change, this re-renders from it, and the picker shows what the edge
 * still says (rule 15).
 */
export function EdgeInspector({
  model,
  onChange,
}: {
  readonly model: EdgeInspectorModel;
  onChange(patch: EdgePatch): void;
}) {
  return (
    <div data-slot="edge-inspector" className="flex flex-col gap-3">
      <header className="flex flex-col gap-0.5">
        <h2 className="text-sm font-bold">{EDGE_HEADING}</h2>
        <p className="text-xs text-muted-foreground">{EDGE_HINT}</p>
      </header>
      <EdgePicker
        label="Source"
        value={model.source}
        choices={model.nodes}
        onChange={(source) => onChange({ source })}
      />
      {model.branches === undefined ? null : (
        <EdgePicker
          label="From branch"
          value={model.sourceHandle}
          choices={model.branches}
          onChange={(sourceHandle) => onChange({ sourceHandle })}
        />
      )}
      <EdgePicker
        label="Target"
        value={model.target}
        choices={model.nodes}
        onChange={(target) => onChange({ target })}
      />
    </div>
  );
}

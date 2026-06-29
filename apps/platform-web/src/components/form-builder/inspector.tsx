import { Button } from '@repo/ui/button';
import { Input } from '@repo/ui/input';
import { Label } from '@repo/ui/label';
import { Switch } from '@repo/ui/switch';
import { Textarea } from '@repo/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { ENUM_FIELD_TYPES } from './field-types';
import type { ContainerNode, ControlNode, EnumOption, FieldNode, FormModel } from './model';

function Row({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function EnumOptionsEditor({
  node,
  onChange,
}: {
  node: ControlNode;
  onChange: (patch: Partial<ControlNode>) => void;
}) {
  const options = node.enumOptions ?? [];
  const withLabels = node.fieldType === 'oneof';
  const set = (next: EnumOption[]) => onChange({ enumOptions: next });
  const update = (index: number, patch: Partial<EnumOption>) =>
    set(
      options.map((opt, i) => {
        if (i !== index) {
          return opt;
        }
        const merged = { ...opt, ...patch };
        // Value-only fields keep label in step with value so the schema round-trips.
        return withLabels ? merged : { value: merged.value, label: merged.value };
      }),
    );
  return (
    <div className="flex flex-col gap-2">
      <Label>Options</Label>
      {options.length === 0 ? (
        <p className="text-xs text-destructive">Add at least one option.</p>
      ) : null}
      {options.map((opt, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            aria-label={`Option ${index + 1} value`}
            value={opt.value}
            onChange={(event) => update(index, { value: event.target.value })}
          />
          {withLabels ? (
            <Input
              aria-label={`Option ${index + 1} label`}
              value={opt.label}
              onChange={(event) => update(index, { label: event.target.value })}
            />
          ) : null}
          <Button
            size="xs"
            variant="ghost"
            type="button"
            aria-label={`Remove option ${index + 1}`}
            onClick={() => set(options.filter((_, i) => i !== index))}
          >
            <Trash2 className="size-3.5" aria-hidden />
          </Button>
        </div>
      ))}
      <Button
        size="xs"
        variant="outline"
        type="button"
        onClick={() =>
          set([
            ...options,
            { value: `option_${options.length + 1}`, label: `Option ${options.length + 1}` },
          ])
        }
      >
        <Plus className="size-3.5" aria-hidden />
        Add option
      </Button>
    </div>
  );
}

function ControlInspector({
  node,
  duplicateKey,
  onChange,
}: {
  node: ControlNode;
  duplicateKey: boolean;
  onChange: (patch: Partial<ControlNode>) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Row label="Label" htmlFor="insp-label">
        <Input
          id="insp-label"
          value={node.label}
          onChange={(e) => onChange({ label: e.target.value })}
        />
      </Row>
      <Row label="Field key" htmlFor="insp-key">
        <Input
          id="insp-key"
          value={node.key}
          aria-invalid={duplicateKey || undefined}
          onChange={(e) => onChange({ key: e.target.value })}
        />
        {duplicateKey ? (
          <p className="text-xs text-destructive">Another field already uses this key.</p>
        ) : null}
      </Row>
      <Row label="Help text" htmlFor="insp-help">
        <Textarea
          id="insp-help"
          rows={2}
          value={node.description ?? ''}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </Row>
      <div className="flex items-center justify-between">
        <Label htmlFor="insp-required">Required</Label>
        <Switch
          id="insp-required"
          aria-label="Required"
          checked={node.required}
          onCheckedChange={(checked) => onChange({ required: checked })}
        />
      </div>
      {ENUM_FIELD_TYPES.has(node.fieldType) ? (
        <EnumOptionsEditor node={node} onChange={onChange} />
      ) : null}
      {node.fieldType === 'slider' ? (
        <div className="grid grid-cols-3 gap-2">
          <Row label="Min" htmlFor="insp-min">
            <Input
              id="insp-min"
              type="number"
              value={node.min ?? 0}
              onChange={(e) => onChange({ min: Number(e.target.value) })}
            />
          </Row>
          <Row label="Max" htmlFor="insp-max">
            <Input
              id="insp-max"
              type="number"
              value={node.max ?? 100}
              onChange={(e) => onChange({ max: Number(e.target.value) })}
            />
          </Row>
          <Row label="Step" htmlFor="insp-step">
            <Input
              id="insp-step"
              type="number"
              value={node.step ?? 1}
              onChange={(e) => onChange({ step: Number(e.target.value) })}
            />
          </Row>
        </div>
      ) : null}
    </div>
  );
}

/** Right column: config for the selected field, or form-level settings when nothing is selected. */
export function Inspector({
  node,
  allKeys,
  form,
  onChangeControl,
  onChangeContainer,
  onChangeForm,
}: {
  node: FieldNode | null;
  allKeys: string[];
  form: Pick<FormModel, 'title' | 'description'>;
  onChangeControl: (patch: Partial<ControlNode>) => void;
  onChangeContainer: (patch: Partial<ContainerNode>) => void;
  onChangeForm: (patch: Partial<Pick<FormModel, 'title' | 'description'>>) => void;
}) {
  const body = (() => {
    if (node === null) {
      return (
        <div className="flex flex-col gap-4">
          <Row label="Title" htmlFor="settings-title">
            <Input
              id="settings-title"
              value={form.title}
              onChange={(e) => onChangeForm({ title: e.target.value })}
            />
          </Row>
          <Row label="Description" htmlFor="settings-desc">
            <Textarea
              id="settings-desc"
              rows={3}
              value={form.description}
              onChange={(e) => onChangeForm({ description: e.target.value })}
            />
          </Row>
        </div>
      );
    }
    if (node.kind === 'container') {
      return (
        <Row label="Section title" htmlFor="insp-container-label">
          <Input
            id="insp-container-label"
            value={node.label ?? ''}
            onChange={(e) => onChangeContainer({ label: e.target.value })}
          />
        </Row>
      );
    }
    const duplicateKey = allKeys.filter((k) => k === node.key).length > 1;
    return <ControlInspector node={node} duplicateKey={duplicateKey} onChange={onChangeControl} />;
  })();

  return (
    <section
      aria-label="Inspector"
      className="flex h-full flex-col gap-3 overflow-y-auto border-l border-border bg-card p-4"
    >
      <h2 className="text-sm font-semibold">
        {node === null ? 'Form settings' : node.kind === 'container' ? 'Section' : 'Field settings'}
      </h2>
      {body}
    </section>
  );
}

import { Button } from '@repo/ui/button';
import { Input } from '@repo/ui/input';
import { Label } from '@repo/ui/label';
import { Switch } from '@repo/ui/switch';
import { Textarea } from '@repo/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@repo/ui/toggle-group';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { AddressDefaultsEditor } from './address-defaults-editor';
import { ClearableInput } from './clearable-input';
import { DisplayInspector } from './display-inspector';
import { CHOICE_FIELD_TYPES } from './field-types';
import type {
  ContainerNode,
  ControlNode,
  DisplayNode,
  EnumOption,
  FieldNode,
  FormModel,
} from './model';

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

/**
 * A single-select segmented toggle group (`spacing={0}`) with a clear primary selection. Base UI's
 * ToggleGroup value is an array, so we bind `[value]` and pick the newly-pressed item (never allowing
 * an empty selection). Used by the Boolean "Display as" and Number "Number type" settings.
 */
function SegmentedToggle<T extends string>({
  options,
  value,
  onValueChange,
  fullWidth = false,
}: {
  options: { value: T; label: string }[];
  value: T;
  onValueChange: (value: T) => void;
  /** Stretch the group to its container's width, with items sharing it equally. */
  fullWidth?: boolean;
}) {
  // The default "on" style is bg-muted (same as hover) — too subtle. Use a clear primary fill.
  const pressed =
    'aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary aria-pressed:hover:text-primary-foreground';
  return (
    <ToggleGroup
      variant="outline"
      spacing={0}
      {...(fullWidth ? { className: 'w-full' } : {})}
      value={[value]}
      onValueChange={(values: string[]) =>
        onValueChange((values.find((v) => v !== value) ?? value) as T)
      }
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          className={fullWidth ? `flex-1 ${pressed}` : pressed}
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** The field's auto-generated id (feature 159), muted — click to copy it to the clipboard. */
function FieldIdBadge({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={copy}
      title="Copy field ID"
      aria-label={`Copy field ID ${id}`}
      className="shrink-0 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      {copied ? 'Copied!' : `ID: ${id}`}
    </button>
  );
}

/**
 * Choice-field options editor (feature 156, Step 2). Every choice field (select / radio / checkbox
 * group) authors independent `{ value, label }` pairs — the value is stored/validated, the label is
 * shown — and the list is reorderable (its order is the citizen-facing order, serialized to
 * schema-native `oneOf`/`const`/`title` — feature 167).
 */
function ChoiceOptionsEditor({
  node,
  onChange,
}: {
  node: ControlNode;
  onChange: (patch: Partial<ControlNode>) => void;
}) {
  const options = node.enumOptions ?? [];
  const set = (next: EnumOption[]) => onChange({ enumOptions: next });
  const update = (index: number, patch: Partial<EnumOption>) =>
    set(options.map((opt, i) => (i === index ? { ...opt, ...patch } : opt)));
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= options.length) {
      return;
    }
    const next = options.slice();
    [next[index], next[target]] = [next[target] as EnumOption, next[index] as EnumOption];
    set(next);
  };
  return (
    <div className="flex flex-col gap-2">
      <Label>Options</Label>
      {options.length === 0 ? (
        <p className="text-xs text-destructive">Add at least one option.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {/* Column headers — Label then Value; the trailing spacer sits over the action buttons. */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex-1">Label</span>
            <span className="flex-1">Value</span>
            <span className="w-[4.5rem] shrink-0" aria-hidden />
          </div>
          {/* At most 5 options are visible; the list scrolls beyond that (5 × h-7 rows ≈ 10.5rem). */}
          <div className="flex max-h-[10.5rem] flex-col gap-1.5 overflow-y-auto pr-1">
            {options.map((opt, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  className="flex-1"
                  aria-label={`Option ${index + 1} label`}
                  value={opt.label}
                  onChange={(event) => update(index, { label: event.target.value })}
                />
                <Input
                  className="flex-1"
                  aria-label={`Option ${index + 1} value`}
                  value={opt.value}
                  onChange={(event) => update(index, { value: event.target.value })}
                />
                <div className="flex shrink-0">
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    type="button"
                    aria-label={`Move option ${index + 1} up`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ChevronUp className="size-3.5" aria-hidden />
                  </Button>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    type="button"
                    aria-label={`Move option ${index + 1} down`}
                    disabled={index === options.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ChevronDown className="size-3.5" aria-hidden />
                  </Button>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    type="button"
                    aria-label={`Remove option ${index + 1}`}
                    onClick={() => set(options.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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

const NUMBER_TYPES: { value: 'decimal' | 'integer'; label: string }[] = [
  { value: 'decimal', label: 'Decimal' },
  { value: 'integer', label: 'Integer' },
];

/** Parse a bound input: empty or unparseable → `undefined` (clears the bound / unbounded). */
function parseBound(raw: string): number | undefined {
  if (raw === '') {
    return undefined;
  }
  const value = Number(raw);
  return Number.isNaN(value) ? undefined : value;
}

/** Parse a decimal-places input → a non-negative integer, or `undefined` (unbounded precision). */
function parseDecimals(raw: string): number | undefined {
  if (raw === '') {
    return undefined;
  }
  const value = Math.floor(Number(raw));
  return Number.isNaN(value) || value < 0 ? undefined : value;
}

/** Number-field settings (feature 155): integer/decimal type + optional min/max bounds. */
function NumberSettings({
  node,
  onChange,
}: {
  node: ControlNode;
  onChange: (patch: Partial<ControlNode>) => void;
}) {
  const activeType = node.numberType ?? 'decimal';
  const boundsInverted =
    typeof node.min === 'number' && typeof node.max === 'number' && node.max < node.min;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Number type</Label>
        <SegmentedToggle
          fullWidth
          options={NUMBER_TYPES}
          value={activeType}
          onValueChange={(numberType) => onChange({ numberType })}
        />
      </div>
      {activeType === 'decimal' ? (
        <Row label="Decimal places" htmlFor="insp-num-decimals">
          <ClearableInput
            id="insp-num-decimals"
            type="number"
            min={0}
            step={1}
            value={node.decimalPlaces ?? ''}
            onChange={(e) => onChange({ decimalPlaces: parseDecimals(e.target.value) })}
            onClear={() => onChange({ decimalPlaces: undefined })}
          />
        </Row>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Row label="Min" htmlFor="insp-num-min">
          <ClearableInput
            id="insp-num-min"
            type="number"
            value={node.min ?? ''}
            onChange={(e) => onChange({ min: parseBound(e.target.value) })}
            onClear={() => onChange({ min: undefined })}
          />
        </Row>
        <Row label="Max" htmlFor="insp-num-max">
          <ClearableInput
            id="insp-num-max"
            type="number"
            value={node.max ?? ''}
            aria-invalid={boundsInverted || undefined}
            onChange={(e) => onChange({ max: parseBound(e.target.value) })}
            onClear={() => onChange({ max: undefined })}
          />
        </Row>
      </div>
      {boundsInverted ? (
        <p className="text-xs text-destructive">Max must be greater than or equal to Min.</p>
      ) : null}
    </div>
  );
}

const RENDER_AS: { value: 'checkbox' | 'toggle'; label: string }[] = [
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'toggle', label: 'Toggle' },
];

/** Boolean-field settings (feature 156): render as a tick box or an on/off toggle (Switch). */
function BooleanSettings({
  node,
  onChange,
}: {
  node: ControlNode;
  onChange: (patch: Partial<ControlNode>) => void;
}) {
  const activeType = node.renderAs ?? 'checkbox';
  return (
    <div className="flex flex-col gap-1.5">
      <Label>Display as</Label>
      <SegmentedToggle
        fullWidth
        options={RENDER_AS}
        value={activeType}
        onValueChange={(renderAs) => onChange({ renderAs })}
      />
    </div>
  );
}

/** Parse a positive-integer input → an integer ≥ 1, or `undefined` (empty / invalid → clears). */
function parsePositiveInt(raw: string): number | undefined {
  if (raw === '') {
    return undefined;
  }
  const value = Math.floor(Number(raw));
  return Number.isNaN(value) || value < 1 ? undefined : value;
}

/** Text-field settings (feature 158): placeholder, multiline toggle, visible rows, max length. */
function TextSettings({
  node,
  onChange,
}: {
  node: ControlNode;
  onChange: (patch: Partial<ControlNode>) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Row label="Placeholder" htmlFor="insp-placeholder">
        <ClearableInput
          id="insp-placeholder"
          value={node.placeholder ?? ''}
          onChange={(e) => onChange({ placeholder: e.target.value })}
          onClear={() => onChange({ placeholder: '' })}
        />
      </Row>
      <div className="flex items-center justify-between">
        <Label htmlFor="insp-multiline">Multiline</Label>
        <Switch
          id="insp-multiline"
          aria-label="Multiline"
          checked={node.multiline === true}
          onCheckedChange={(checked) => onChange({ multiline: checked })}
        />
      </div>
      {node.multiline !== true ? (
        <Row label="Input mask" htmlFor="insp-mask">
          <ClearableInput
            id="insp-mask"
            placeholder="(999) 999-9999"
            value={node.mask ?? ''}
            onChange={(e) => onChange({ mask: e.target.value })}
            onClear={() => onChange({ mask: '' })}
          />
          <p className="text-xs text-muted-foreground">
            inputmask pattern — 9 = digit, a = letter, * = alphanumeric.
          </p>
        </Row>
      ) : null}
      <Row label="Max length" htmlFor="insp-maxlength">
        <ClearableInput
          id="insp-maxlength"
          type="number"
          min={1}
          value={node.maxLength ?? ''}
          onChange={(e) => onChange({ maxLength: parsePositiveInt(e.target.value) })}
          onClear={() => onChange({ maxLength: undefined })}
        />
      </Row>
    </div>
  );
}

function ControlInspector({
  node,
  onChange,
}: {
  node: ControlNode;
  onChange: (patch: Partial<ControlNode>) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Row label="Label" htmlFor="insp-label">
        <ClearableInput
          id="insp-label"
          value={node.label}
          aria-invalid={node.label.trim() === '' || undefined}
          onChange={(e) => onChange({ label: e.target.value })}
          onClear={() => onChange({ label: '' })}
        />
        {node.label.trim() === '' ? (
          <p className="text-xs text-destructive">A label is required.</p>
        ) : null}
      </Row>
      <Row label="Field description" htmlFor="insp-help">
        <Textarea
          id="insp-help"
          rows={2}
          value={node.description ?? ''}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Additional guidance for the user (optional)"
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
      {node.fieldType === 'text' ? <TextSettings node={node} onChange={onChange} /> : null}
      {node.fieldType === 'boolean' ? <BooleanSettings node={node} onChange={onChange} /> : null}
      {node.fieldType === 'select' ? (
        <>
          <div className="flex items-center justify-between">
            <Label htmlFor="insp-multiple">Allow multiple</Label>
            <Switch
              id="insp-multiple"
              aria-label="Allow multiple"
              checked={node.multiple === true}
              onCheckedChange={(checked) => onChange({ multiple: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="insp-combobox">Combobox</Label>
            <Switch
              id="insp-combobox"
              aria-label="Combobox"
              checked={node.combobox === true}
              onCheckedChange={(checked) => onChange({ combobox: checked })}
            />
          </div>
        </>
      ) : null}
      {CHOICE_FIELD_TYPES.has(node.fieldType) ? (
        <ChoiceOptionsEditor node={node} onChange={onChange} />
      ) : null}
      {node.fieldType === 'address' ? (
        <AddressDefaultsEditor node={node} onChange={onChange} />
      ) : null}
      {node.fieldType === 'number' ? <NumberSettings node={node} onChange={onChange} /> : null}
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
  form,
  onChangeControl,
  onChangeContainer,
  onChangeDisplay,
  onChangeForm,
}: {
  node: FieldNode | null;
  /** Retained for the caller's convenience; no longer used (keys are auto-generated — feature 159). */
  allKeys?: string[];
  form: Pick<FormModel, 'title' | 'description'>;
  onChangeControl: (patch: Partial<ControlNode>) => void;
  onChangeContainer: (patch: Partial<ContainerNode>) => void;
  onChangeDisplay: (patch: Partial<DisplayNode>) => void;
  onChangeForm: (patch: Partial<Pick<FormModel, 'title' | 'description'>>) => void;
}) {
  const body = (() => {
    if (node === null) {
      return (
        <div className="flex flex-col gap-4">
          <Row label="Title" htmlFor="settings-title">
            <ClearableInput
              id="settings-title"
              value={form.title}
              aria-invalid={form.title.trim() === '' || undefined}
              onChange={(e) => onChangeForm({ title: e.target.value })}
              onClear={() => onChangeForm({ title: '' })}
            />
            {form.title.trim() === '' ? (
              <p className="text-xs text-destructive">A title is required.</p>
            ) : null}
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
      if (node.layout === 'grid') {
        // Feature 169: Grid authors a fixed column count, not a Section title (matches Horizontal's
        // title-less behavior).
        return (
          <Row label="Columns" htmlFor="insp-container-columns">
            <Input
              id="insp-container-columns"
              type="number"
              min={2}
              max={6}
              value={node.columns ?? 2}
              onChange={(e) => {
                const next = Math.min(6, Math.max(2, Number(e.target.value) || 2));
                onChangeContainer({ columns: next });
              }}
            />
          </Row>
        );
      }
      return (
        <Row label="Section title" htmlFor="insp-container-label">
          <ClearableInput
            id="insp-container-label"
            value={node.label ?? ''}
            onChange={(e) => onChangeContainer({ label: e.target.value })}
            onClear={() => onChangeContainer({ label: '' })}
          />
        </Row>
      );
    }
    if (node.kind === 'display') {
      return <DisplayInspector node={node} onChange={onChangeDisplay} />;
    }
    return <ControlInspector node={node} onChange={onChangeControl} />;
  })();

  const heading =
    node === null
      ? 'Form settings'
      : node.kind === 'container'
        ? 'Section'
        : node.kind === 'display'
          ? 'Content'
          : 'Field settings';

  return (
    <section
      aria-label="Inspector"
      className="flex h-full flex-col gap-3 overflow-y-auto border-l border-border bg-card p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{heading}</h2>
        {node !== null && node.kind === 'control' ? <FieldIdBadge id={node.key} /> : null}
      </div>
      {body}
    </section>
  );
}

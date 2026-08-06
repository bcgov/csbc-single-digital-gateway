/**
 * (De)serialization between the builder's `FormModel` and a JSONForms definition
 * (`{ schema, uischema }`). `parseModel`/`serializeModel` round-trip; the model is the editor's
 * source of truth (see model.ts). Split from model.ts to keep each file under the size gate.
 */
import { CHOICE_FIELD_TYPES, type FieldTypeId } from './field-types';
import type {
  ContainerNode,
  ControlNode,
  DisplayNode,
  EnumOption,
  FieldNode,
  FormDefinition,
  FormModel,
  HeadingLevel,
} from './model';

type JsonObject = Record<string, unknown>;

// ── Serialize: model → { schema, uischema } ──────────────────────────────────────────────────────

function propertySchema(node: ControlNode): JsonObject {
  const values = (node.enumOptions ?? []).map((o) => o.value);
  const base: JsonObject = {};
  switch (node.fieldType) {
    case 'number':
      // Feature 155: integer vs decimal → schema `type`; optional min/max bounds (omit when unset).
      base.type = node.numberType === 'integer' ? 'integer' : 'number';
      if (typeof node.min === 'number') {
        base.minimum = node.min;
      }
      if (typeof node.max === 'number') {
        base.maximum = node.max;
      }
      break;
    case 'slider':
      Object.assign(base, {
        type: 'number',
        minimum: node.min ?? 0,
        maximum: node.max ?? 100,
        default: node.min ?? 0,
      });
      break;
    case 'boolean':
      Object.assign(base, { type: 'boolean' });
      break;
    case 'date':
      Object.assign(base, { type: 'string', format: 'date' });
      break;
    case 'time':
      // Feature 157: a 24-hour HH:MM string. Validated by `pattern` (NOT JSON-Schema `format:'time'`,
      // which ajv-formats requires to carry seconds), so a bare HH:MM passes submit validation.
      Object.assign(base, { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' });
      break;
    case 'datetime':
      // Feature 157: a local wall-clock 'YYYY-MM-DDTHH:MM' string. `pattern` (not `format:'date-time'`,
      // which ajv-formats requires a timezone offset for) so a bare local datetime passes validation.
      Object.assign(base, {
        type: 'string',
        pattern: '^\\d{4}-\\d{2}-\\d{2}T([01]\\d|2[0-3]):[0-5]\\d$',
      });
      break;
    case 'daterange': {
      // Feature 157: an object of two ISO dates. A required range requires BOTH endpoints (the object's
      // own `required`), on top of the parent-level `required` (the key must exist) added below.
      Object.assign(base, {
        type: 'object',
        properties: {
          start: { type: 'string', format: 'date' },
          end: { type: 'string', format: 'date' },
        },
      });
      if (node.required) {
        base.required = ['start', 'end'];
      }
      break;
    }
    case 'radio':
      // Feature 156 (Step 2): single choice → a string enum (values only; labels live in options.choices).
      Object.assign(base, { type: 'string', enum: values });
      break;
    case 'select':
      // Single → string enum; multi → array of enum (uniqueItems). Labels are carried in options.choices.
      if (node.multiple === true) {
        Object.assign(base, {
          type: 'array',
          uniqueItems: true,
          items: { type: 'string', enum: values },
        });
        if (node.required) {
          base.minItems = 1;
        }
      } else {
        Object.assign(base, { type: 'string', enum: values });
      }
      break;
    case 'checkboxes':
      Object.assign(base, {
        type: 'array',
        uniqueItems: true,
        items: { type: 'string', enum: values },
      });
      if (node.required) {
        // A required checkbox group must have ≥1 box ticked — object-level `required` only checks the
        // key exists (an empty array would pass), so pin non-emptiness with `minItems`.
        base.minItems = 1;
      }
      break;
    case 'address': {
      // A required address requires every field EXCEPT address_two, and each required field must be
      // NON-EMPTY. `minLength: 1` is essential: the control writes empty strings for untouched fields,
      // so an object-level `required` alone (which only checks the key exists) would pass on blanks.
      const requiredSubFields = ['country', 'address_one', 'city', 'province', 'postal_code'];
      const stringField = (key: string): JsonObject =>
        node.required && requiredSubFields.includes(key)
          ? { type: 'string', minLength: 1 }
          : { type: 'string' };
      Object.assign(base, {
        type: 'object',
        properties: {
          country: stringField('country'),
          address_one: stringField('address_one'),
          address_two: stringField('address_two'),
          city: stringField('city'),
          province: stringField('province'),
          postal_code: stringField('postal_code'),
        },
      });
      if (node.required) {
        base.required = requiredSubFields;
      }
      // Author-set defaults (feature 153) → JSON-Schema `default`, seeded into the field for citizens.
      const addressDefault: JsonObject = {};
      if (node.defaultCountry !== undefined && node.defaultCountry !== '') {
        addressDefault.country = node.defaultCountry;
      }
      if (node.defaultProvince !== undefined && node.defaultProvince !== '') {
        addressDefault.province = node.defaultProvince;
      }
      if (Object.keys(addressDefault).length > 0) {
        base.default = addressDefault;
      }
      break;
    }
    case 'text':
      // Feature 158: a plain string; a max length becomes `schema.maxLength` (Ajv-validated on submit).
      Object.assign(base, { type: 'string' });
      if (typeof node.maxLength === 'number') {
        base.maxLength = node.maxLength;
      }
      break;
    default:
      Object.assign(base, { type: 'string' });
  }
  if (node.label !== '') {
    base.title = node.label;
  }
  if (node.description !== undefined && node.description !== '') {
    base.description = node.description;
  }
  return base;
}

function controlOptions(node: ControlNode): JsonObject {
  const options: JsonObject = { ...node.options };
  if (node.fieldType === 'text') {
    // Feature 158: multi-line, visible rows and placeholder are presentational → uischema options.
    if (node.multiline === true) {
      options.multi = true;
    } else if (node.mask !== undefined && node.mask !== '') {
      // Input mask is single-line only (masks don't apply to a textarea).
      options.mask = node.mask;
    }
    if (node.placeholder !== undefined && node.placeholder !== '') {
      options.placeholder = node.placeholder;
    }
  }
  if (node.fieldType === 'boolean' && node.renderAs === 'toggle') {
    // Feature 156: a boolean field authored to display as a toggle emits the same `options.toggle` flag
    // the old standalone Toggle field did → the `@repo/react` Switch renderer. `'checkbox'` emits nothing.
    options.toggle = true;
  }
  if (CHOICE_FIELD_TYPES.has(node.fieldType)) {
    // Feature 156 (Step 2): the unified choice control reads its presentation + labelled options here.
    options.format = 'choice';
    options.display =
      node.fieldType === 'radio'
        ? 'radio'
        : node.fieldType === 'checkboxes'
          ? 'checkboxes'
          : 'select';
    if (node.fieldType === 'select') {
      options.multiple = node.multiple === true;
    }
    options.choices = (node.enumOptions ?? []).map((o) => ({ value: o.value, label: o.label }));
  }
  if (node.fieldType === 'richtext') {
    options.format = 'richtext';
  }
  if (node.fieldType === 'address') {
    options.format = 'address';
  }
  if (node.fieldType === 'daterange') {
    options.format = 'daterange';
  }
  if (node.fieldType === 'time') {
    options.format = 'time';
  }
  if (node.fieldType === 'datetime') {
    options.format = 'datetime';
  }
  if (
    node.fieldType === 'number' &&
    node.numberType === 'decimal' &&
    typeof node.decimalPlaces === 'number'
  ) {
    // Entry constraint (feature 155): max digits after the decimal point. Kept in options (not a
    // schema keyword) so it's enforced by explicit client/server passes, not fragile Ajv `multipleOf`.
    options.decimals = node.decimalPlaces;
  }
  if (node.fieldType === 'slider') {
    // `options.slider` is the JSONForms `isRangeControl` signal AND the codec's sole slider
    // discriminator (feature 155) — it keeps a number-with-min/max from parsing back as a slider.
    options.slider = true;
    if (node.step !== undefined) {
      options.step = node.step;
    }
  }
  return options;
}

function controlElement(node: ControlNode): JsonObject {
  const element: JsonObject = { type: 'Control', scope: `#/properties/${node.key}` };
  if (node.label !== '') {
    element.label = node.label;
  }
  const options = controlOptions(node);
  if (Object.keys(options).length > 0) {
    element.options = options;
  }
  return element;
}

/** A display-only node → a `Label` uischema element. Never emits a `schema.properties` entry. */
function displayElement(node: DisplayNode): JsonObject {
  const options: JsonObject = { format: node.displayType };
  if (node.displayType === 'heading') {
    options.level = node.level ?? 2;
  }
  if (node.displayType === 'paragraph' && node.align !== undefined && node.align !== 'left') {
    options.align = node.align;
  }
  if (node.displayType === 'richtext') {
    options.content = node.content ?? null;
  }
  return {
    type: 'Label',
    text: node.displayType === 'richtext' ? '' : node.text,
    options,
    i: node.id,
  };
}

export function serializeModel(model: FormModel): FormDefinition {
  const properties: JsonObject = {};
  const required: string[] = [];
  const elements: JsonObject[] = [];

  const addControl = (node: ControlNode): JsonObject => {
    properties[node.key] = propertySchema(node);
    if (node.required) {
      required.push(node.key);
    }
    return controlElement(node);
  };

  const serializeChild = (node: ControlNode | DisplayNode): JsonObject =>
    node.kind === 'control' ? addControl(node) : displayElement(node);

  for (const field of model.fields) {
    if (field.kind === 'container') {
      const layoutType = field.layout === 'group' ? 'Group' : 'HorizontalLayout';
      const child = {
        type: layoutType,
        elements: field.children.map(serializeChild),
      } as JsonObject;
      if (field.layout === 'group' && field.label !== undefined && field.label !== '') {
        child.label = field.label;
      }
      elements.push(child);
    } else {
      elements.push(serializeChild(field));
    }
  }

  const schema: JsonObject = { type: 'object' };
  if (model.title !== '') {
    schema.title = model.title;
  }
  if (model.description !== '') {
    schema.description = model.description;
  }
  schema.properties = properties;
  schema.required = required;

  return { schema, uischema: { type: 'VerticalLayout', elements } };
}

// ── Parse: { schema, uischema } → model ─────────────────────────────────────────────────────────

function inferFieldType(prop: JsonObject, options: JsonObject): FieldTypeId {
  if (options.format === 'richtext') {
    return 'richtext';
  }
  if (options.format === 'daterange') {
    // Feature 157: also an object schema — must be checked before the generic object→address branch.
    return 'daterange';
  }
  if (options.format === 'time') {
    // Feature 157: a plain pattern-validated string — needs the option flag to not fall through to text.
    return 'time';
  }
  if (options.format === 'datetime') {
    return 'datetime';
  }
  if (options.format === 'address' || prop.type === 'object') {
    return 'address';
  }
  if (options.format === 'choice') {
    // Feature 156 (Step 2): the choice family is discriminated by `options.display`.
    if (options.display === 'radio') {
      return 'radio';
    }
    if (options.display === 'checkboxes') {
      return 'checkboxes';
    }
    return 'select';
  }
  if (prop.type === 'boolean') {
    // Feature 156: a boolean is always the Boolean field; `options.toggle` becomes its `renderAs`.
    return 'boolean';
  }
  if (prop.type === 'number' || prop.type === 'integer') {
    // A numeric control is a slider iff explicitly marked (feature 155); otherwise it's a Number
    // field, whose own min/max no longer imply a slider.
    return options.slider === true ? 'slider' : 'number';
  }
  if (prop.format === 'date') {
    return 'date';
  }
  // Feature 158: a plain string is always the Text field; `options.multi` becomes its `multiline` flag.
  return 'text';
}

/** Feature 156 (Step 2): recover the authored `{ value, label }[]` from `uischema.options.choices`. */
function choicesFromOptions(rawOptions: JsonObject): EnumOption[] {
  const raw = rawOptions.choices;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter((entry): entry is JsonObject => Boolean(entry) && typeof entry === 'object')
    .map((entry) => {
      const value = String(entry.value ?? '');
      const label = entry.label === undefined || entry.label === '' ? value : String(entry.label);
      return { value, label };
    });
}

const KEY_FROM_SCOPE = /^#\/properties\/(.+)$/;

function parseControl(
  element: JsonObject,
  schema: JsonObject,
  required: Set<string>,
): ControlNode | null {
  const scope = typeof element.scope === 'string' ? element.scope : '';
  const key = KEY_FROM_SCOPE.exec(scope)?.[1];
  if (key === undefined) {
    return null;
  }
  const properties = (schema.properties as JsonObject | undefined) ?? {};
  const prop = (properties[key] as JsonObject | undefined) ?? {};
  const rawOptions = (element.options as JsonObject | undefined) ?? {};
  const fieldType = inferFieldType(prop, rawOptions);

  // Drop the synthesized option flags so the node's `options` round-trips to an empty object.
  const {
    multi: _m,
    toggle: _t,
    format: _f,
    slider: _s,
    display: _d,
    multiple: _mult,
    choices: _c,
    placeholder: _ph,
    rows: _r,
    mask: _mk,
    step,
    decimals,
    ...userOptions
  } = rawOptions;
  void _m;
  void _t;
  void _f;
  void _s;
  void _d;
  void _mult;
  void _c;
  void _ph;
  void _r;
  void _mk;

  const label =
    typeof element.label === 'string' ? element.label : ((prop.title as string | undefined) ?? '');
  const node: ControlNode = {
    kind: 'control',
    key,
    fieldType,
    label,
    required: required.has(key),
    options: userOptions,
  };
  if (typeof prop.description === 'string') {
    node.description = prop.description;
  }
  if (fieldType === 'text') {
    // Feature 158: recover multiline/placeholder/rows from options + maxLength from the schema.
    if (rawOptions.multi === true) {
      node.multiline = true;
    }
    if (typeof rawOptions.placeholder === 'string' && rawOptions.placeholder !== '') {
      node.placeholder = rawOptions.placeholder;
    }
    if (typeof rawOptions.mask === 'string' && rawOptions.mask !== '') {
      node.mask = rawOptions.mask;
    }
    if (typeof prop.maxLength === 'number') {
      node.maxLength = prop.maxLength;
    }
  }
  if (CHOICE_FIELD_TYPES.has(fieldType)) {
    node.enumOptions = choicesFromOptions(rawOptions);
    if (fieldType === 'select') {
      node.multiple = rawOptions.multiple === true;
    }
  }
  if (fieldType === 'boolean') {
    // Feature 156: recover the boolean field's display affordance from the `toggle` option flag
    // (already stripped from `userOptions` above), so it round-trips as `renderAs`.
    node.renderAs = rawOptions.toggle === true ? 'toggle' : 'checkbox';
  }
  if (fieldType === 'number') {
    // Feature 155: recover the authored type + bounds. `numberType` always present (defaults decimal);
    // min/max only when the schema actually carries them (a bare number stays unbounded).
    node.numberType = prop.type === 'integer' ? 'integer' : 'decimal';
    if (typeof prop.minimum === 'number') {
      node.min = prop.minimum;
    }
    if (typeof prop.maximum === 'number') {
      node.max = prop.maximum;
    }
    if (node.numberType === 'decimal' && typeof decimals === 'number') {
      node.decimalPlaces = decimals;
    }
  }
  if (fieldType === 'slider') {
    node.min = (prop.minimum as number | undefined) ?? 0;
    node.max = (prop.maximum as number | undefined) ?? 100;
    node.step = typeof step === 'number' ? step : 1;
  }
  if (fieldType === 'address') {
    const addressDefault = prop.default as JsonObject | undefined;
    if (typeof addressDefault?.country === 'string' && addressDefault.country !== '') {
      node.defaultCountry = addressDefault.country;
    }
    if (typeof addressDefault?.province === 'string' && addressDefault.province !== '') {
      node.defaultProvince = addressDefault.province;
    }
  }
  return node;
}

/** A `Label` element carrying `options.format` → a display node (else null for a plain label). */
function parseDisplay(element: JsonObject): DisplayNode | null {
  const options = (element.options as JsonObject | undefined) ?? {};
  const format = options.format;
  if (format !== 'heading' && format !== 'paragraph' && format !== 'richtext') {
    return null;
  }
  const id = typeof element.i === 'string' ? element.i : globalThis.crypto.randomUUID();
  const text = typeof element.text === 'string' ? element.text : '';
  if (format === 'heading') {
    const level: HeadingLevel = options.level === 3 ? 3 : 2;
    return { kind: 'display', displayType: 'heading', id, text, level };
  }
  if (format === 'paragraph') {
    const node: DisplayNode = { kind: 'display', displayType: 'paragraph', id, text };
    if (options.align === 'center' || options.align === 'right') {
      node.align = options.align;
    }
    return node;
  }
  return {
    kind: 'display',
    displayType: 'richtext',
    id,
    text: '',
    content: options.content ?? null,
  };
}

/** Parse one layout child element into a control or display node (else null). */
function parseChild(
  element: JsonObject,
  schema: JsonObject,
  required: Set<string>,
): ControlNode | DisplayNode | null {
  return element.type === 'Label' ? parseDisplay(element) : parseControl(element, schema, required);
}

export function parseModel(definition: FormDefinition): FormModel {
  const schema = (definition.schema as JsonObject | undefined) ?? {};
  const uischema = (definition.uischema as JsonObject | undefined) ?? {};
  const required = new Set((schema.required as string[] | undefined) ?? []);
  const elements = (uischema.elements as JsonObject[] | undefined) ?? [];

  const fields: FieldNode[] = [];
  for (const element of elements) {
    if (element.type === 'Control') {
      const control = parseControl(element, schema, required);
      if (control !== null) {
        fields.push(control);
      }
    } else if (element.type === 'Label') {
      const display = parseDisplay(element);
      if (display !== null) {
        fields.push(display);
      }
    } else if (element.type === 'Group' || element.type === 'HorizontalLayout') {
      const children = ((element.elements as JsonObject[] | undefined) ?? [])
        .map((child) => parseChild(child, schema, required))
        .filter((c): c is ControlNode | DisplayNode => c !== null);
      const node: ContainerNode = {
        kind: 'container',
        layout: element.type === 'Group' ? 'group' : 'horizontal',
        children,
      };
      if (typeof element.label === 'string') {
        node.label = element.label;
      }
      fields.push(node);
    }
  }

  return {
    title: typeof schema.title === 'string' ? schema.title : '',
    description: typeof schema.description === 'string' ? schema.description : '',
    fields,
  };
}

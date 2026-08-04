/**
 * (De)serialization between the builder's `FormModel` and a JSONForms definition
 * (`{ schema, uischema }`). `parseModel`/`serializeModel` round-trip; the model is the editor's
 * source of truth (see model.ts). Split from model.ts to keep each file under the size gate.
 */
import { ENUM_FIELD_TYPES, type FieldTypeId } from './field-types';
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
      Object.assign(base, { type: 'number' });
      break;
    case 'slider':
      Object.assign(base, {
        type: 'number',
        minimum: node.min ?? 0,
        maximum: node.max ?? 100,
        default: node.min ?? 0,
      });
      break;
    case 'checkbox':
    case 'toggle':
      Object.assign(base, { type: 'boolean' });
      break;
    case 'date':
      Object.assign(base, { type: 'string', format: 'date' });
      break;
    case 'select':
    case 'radio':
      Object.assign(base, { type: 'string', enum: values });
      break;
    case 'oneof':
      Object.assign(base, {
        type: 'string',
        oneOf: (node.enumOptions ?? []).map((o) => ({ const: o.value, title: o.label })),
      });
      break;
    case 'multiselect':
      Object.assign(base, {
        type: 'array',
        uniqueItems: true,
        items: { type: 'string', enum: values },
      });
      break;
    case 'address': {
      Object.assign(base, {
        type: 'object',
        properties: {
          country: { type: 'string' },
          address_one: { type: 'string' },
          address_two: { type: 'string' },
          city: { type: 'string' },
          province: { type: 'string' },
          postal_code: { type: 'string' },
        },
      });
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
  if (node.fieldType === 'multiline') {
    options.multi = true;
  }
  if (node.fieldType === 'toggle') {
    options.toggle = true;
  }
  if (node.fieldType === 'radio') {
    options.format = 'radio';
  }
  if (node.fieldType === 'richtext') {
    options.format = 'richtext';
  }
  if (node.fieldType === 'address') {
    options.format = 'address';
  }
  if (node.fieldType === 'slider' && node.step !== undefined) {
    options.step = node.step;
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
  if (options.format === 'address' || prop.type === 'object') {
    return 'address';
  }
  if (prop.type === 'array') {
    return 'multiselect';
  }
  if (prop.type === 'boolean') {
    return options.toggle === true ? 'toggle' : 'checkbox';
  }
  if (Array.isArray(prop.oneOf)) {
    return 'oneof';
  }
  if (Array.isArray(prop.enum)) {
    return options.format === 'radio' ? 'radio' : 'select';
  }
  if (prop.type === 'number' || prop.type === 'integer') {
    return prop.minimum !== undefined && prop.maximum !== undefined ? 'slider' : 'number';
  }
  if (prop.format === 'date') {
    return 'date';
  }
  if (options.multi === true) {
    return 'multiline';
  }
  return 'text';
}

function enumOptionsFromProp(prop: JsonObject): EnumOption[] {
  if (Array.isArray(prop.oneOf)) {
    return (prop.oneOf as Array<{ const?: unknown; title?: unknown }>).map((o) => ({
      value: String(o.const ?? ''),
      label: String(o.title ?? o.const ?? ''),
    }));
  }
  const items = (prop.type === 'array' ? (prop.items as JsonObject | undefined) : prop) ?? prop;
  const values = (items.enum as unknown[] | undefined) ?? [];
  return values.map((v) => ({ value: String(v), label: String(v) }));
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
  const { multi: _m, toggle: _t, format: _f, step, ...userOptions } = rawOptions;
  void _m;
  void _t;
  void _f;

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
  if (ENUM_FIELD_TYPES.has(fieldType)) {
    node.enumOptions = enumOptionsFromProp(prop);
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

import type { JsonSchema } from '@jsonforms/core';
import { FORM_TITLE_PLACEHOLDER } from '../../renderers/gridstack/form-renderer';
import {
  TAB_TYPE,
  FORM_TYPE,
  isPageRoot,
  SERVICE_TYPE,
} from '../../renderers/gridstack/grid-layouts';
import { SERVICE_TITLE_PLACEHOLDER } from '../../renderers/gridstack/service-renderer';
import { CONDITION_TYPE, FLOW_TYPE, STAGE_TYPE } from '../../renderers/xyflow/flow-elements';
import type { TreeElement } from '../layout/element-tree';
import { BOOLEAN, integer, NUMBER, STRING, wholeNumbers } from './field-schemas';
import type { InspectorContext } from './inspector-context';
import {
  finite,
  isRecord,
  optionsOf,
  orCleared,
  setElement,
  setProperty,
  setRequired,
  text,
  withElementKey,
  withOption,
  withWidth,
  type InspectorEdit,
} from './inspector-edits';
import { TAB_FIELDS } from './tab-fields';
import { CONTENT_FIELDS } from './content-fields';
import { DOCUMENT_FIELDS } from './document-fields';
import { optionField, propertyField, type Applies } from './field-factory';
import { LAYOUT_FIELDS } from './layout-fields';
import { SECTION_FIELDS } from './section-fields';
import { componentsOf, currentComponent } from './control-components';
import {
  HIDE_WHEN_MASKED,
  MASK_FIELDS,
  NUMBER_STYLE_FIELDS,
  NUMBER_VALUE_FIELDS,
} from './mask-number-fields';

// The inspector's settings (doc 187 rules 9-19): where each applies, its field schema, and how it reads and
// writes the studio document. Declared in section order, so filtering keeps the rendered order.

export type { InspectorEdit } from './inspector-edits';

/** The inspector form's data — a flat view model keyed by field. */
export type InspectorValues = Record<string, unknown>;

export type SectionId = 'general' | 'validation' | 'appearance' | 'layout';

export const INSPECTOR_SECTIONS: readonly { readonly id: SectionId; readonly label: string }[] =
  Object.freeze([
    Object.freeze({ id: 'general', label: 'General' }),
    Object.freeze({ id: 'validation', label: 'Validation' }),
    Object.freeze({ id: 'appearance', label: 'Appearance' }),
    Object.freeze({ id: 'layout', label: 'Layout' }),
  ]);

export interface InspectorField {
  readonly key: string;
  readonly section: SectionId;
  readonly label: string;
  applies(ctx: InspectorContext): boolean;
  /**
   * Doc 201 rule 13: the displayed label when it depends on the element (a Form's Label is "Title").
   * `label` stays the static fallback, so every caller reading `field.label` keeps working.
   */
  labelFor?(ctx: InspectorContext): string;
  /**
   * Doc 201 rule 12: whether the field is required for this element. `inspectorForm` collects the
   * applicable fields answering true into the form schema's `required`, which is what makes
   * `ControlField` draw the asterisk. Absent (every other field) means never required.
   */
  required?(ctx: InspectorContext): boolean;
  schema(ctx: InspectorContext): JsonSchema;
  /**
   * Doc 204 rule 9c: a JSONForms `rule` hiding the field, for a setting whose RELEVANCE depends on another
   * setting's value. It must NOT be expressed through `applies`: dropping a field rebuilds the inspector form's
   * uischema, JSONForms re-dispatches the section's children, and the control being typed into is remounted —
   * the author loses focus mid-keystroke. A rule keeps the structure identical and only flips `visible`.
   */
  rule?(ctx: InspectorContext): Record<string, unknown> | undefined;
  /** The field Control's uischema `options`, if any. */
  options?(ctx: InspectorContext): Record<string, unknown> | undefined;
  /** The document's current value, or `undefined` when absent or of the wrong JSON type (rule 14). */
  read(ctx: InspectorContext): unknown;
  write(ctx: InspectorContext, edit: InspectorEdit, value: unknown): InspectorEdit;
}

const LAYOUT_LABEL_HINT = 'Names the layout in the element path.';
/** Doc 216 rule 36: a Tab's label is not a path name — it is the text a person reads ON the tab. */
const TAB_LABEL_HINT = 'Shown on the tab itself.';
const STAGE_LABEL_HINT = 'Names the stage on its card and in the element path.';
const CONDITION_LABEL_HINT = 'Names the condition on its card and in the element path.';
/** Doc 201 rule 13: a Form's label is its Title, and it is shown to the citizen, not just in the path. */
const FORM_TITLE_HINT = 'Shown at the top of the form.';
/** Doc 215 rule 18: the same sentence, naming the element the author actually selected. */
const SERVICE_TITLE_HINT = 'Shown at the top of the service.';
const FORM_TITLE_LABEL = 'Title';

const isControl = (ctx: InspectorContext) => ctx.element.type === 'Control';
/**
 * Doc 201 rule 13, widened by doc 215 rule 17. A root boundary's layout kind is `'vertical'` (doc 192 rule 3,
 * doc 215 rule 3), so it already satisfies the generic layout branches — test it FIRST wherever a Form or a
 * Service differs from a plain layout. `isPageRoot` is the ONE predicate for that (doc 215 rule 4).
 */
const isBoundary = (ctx: InspectorContext) => isPageRoot(ctx.element.type);
/**
 * Doc 195 rule 24, widened by doc 199 rule 32: a Flow, Stage or Condition is named like a layout — none has a
 * layout kind. A Condition's criteria are authored on its card, never here, so Label is all it gets.
 */
const isFlowElement = (ctx: InspectorContext) =>
  ctx.element.type === FLOW_TYPE ||
  ctx.element.type === STAGE_TYPE ||
  ctx.element.type === CONDITION_TYPE;
/**
 * Doc 216 rule 36: a Tab carries the NAME while its TabContent carries the layout kind, so the generic Label
 * field has to name it explicitly. Everything else that takes a Label is a Control, a Flow element, or
 * something with a `layoutKind` — a Tab is the first element that is none of the three and still has a name.
 * FOUND BY HAND: splitting `Category` into `Tab` + `TabContent` moved the kind off the element holding the
 * label, and the tab's name silently became unauthorable.
 */
const isTab = (ctx: InspectorContext) => ctx.element.type === TAB_TYPE;

const labelHint = (ctx: InspectorContext) => {
  if (ctx.element.type === TAB_TYPE) return TAB_LABEL_HINT;
  if (ctx.element.type === SERVICE_TYPE) return SERVICE_TITLE_HINT;
  if (ctx.element.type === FORM_TYPE) return FORM_TITLE_HINT;
  if (ctx.element.type === STAGE_TYPE) return STAGE_LABEL_HINT;
  return ctx.element.type === CONDITION_TYPE ? CONDITION_LABEL_HINT : LAYOUT_LABEL_HINT;
};
const isHeading = (ctx: InspectorContext) => ctx.element.type === 'Heading';
const hasProperty = (ctx: InspectorContext) => ctx.propertyKey !== undefined;
const isText = (ctx: InspectorContext) => ctx.controlKind === 'text';
const isNumber = (ctx: InspectorContext) => ctx.controlKind === 'number';
const STEP: JsonSchema = { type: 'number', exclusiveMinimum: 0 };

/** Rule 25: text and number controls, and a choice unless it renders as a radio group. */
const takesPlaceholder: Applies = (ctx) =>
  isText(ctx) ||
  isNumber(ctx) ||
  (ctx.controlKind === 'choice' && currentComponent(ctx) !== 'radio-group') ||
  // Doc 205 rule 34: the multi combobox takes one; the checkbox group ignores it, like a radio group.
  (ctx.controlKind === 'multi-choice' && currentComponent(ctx) !== 'checkbox-group');

export const INSPECTOR_FIELDS: readonly InspectorField[] = Object.freeze([
  {
    key: 'label',
    section: 'general',
    label: 'Label',
    labelFor: (ctx) => (isBoundary(ctx) ? FORM_TITLE_LABEL : 'Label'),
    applies: (ctx) =>
      isControl(ctx) || ctx.layoutKind !== undefined || isFlowElement(ctx) || isTab(ctx),
    schema: (ctx) =>
      ctx.layoutKind || isFlowElement(ctx) || isTab(ctx)
        ? { type: 'string', description: labelHint(ctx) }
        : STRING,
    options: (ctx) => {
      // Doc 201 rule 22, doc 215 rule 18: a boundary's Title offers ITS OWN canvas placeholder — 'Untitled form' or
      // 'Untitled service' — so the field shows the author what the canvas already shows them. A Control's offers the
      // bound property's title.
      if (isBoundary(ctx))
        return {
          placeholder:
            ctx.element.type === SERVICE_TYPE ? SERVICE_TITLE_PLACEHOLDER : FORM_TITLE_PLACEHOLDER,
        };
      const title = text(ctx.property?.title)?.trim();
      return title ? { placeholder: title } : undefined;
    },
    read: (ctx) => text(ctx.element['label' as keyof TreeElement]),
    // Rule 14, RELAXED: a Form's Title is optional now (an untitled Form reads as "Untitled form"), so an emptied
    // Title drops the key exactly like every other element's Label rather than being kept as an invalid ''.
    write: (_ctx, edit, value) =>
      setElement(edit, withElementKey(edit.element, 'label', orCleared(value))),
  },
  ...DOCUMENT_FIELDS,
  ...CONTENT_FIELDS,
  {
    key: 'text',
    section: 'general',
    label: 'Text',
    applies: isHeading,
    schema: () => STRING,
    read: (ctx) => text(ctx.element['text' as keyof TreeElement]),
    // A Heading's `text` is required, so clearing writes '' (rule 17).
    write: (_ctx, edit, value) =>
      setElement(
        edit,
        withElementKey(edit.element, 'text', typeof value === 'string' ? value : ''),
      ),
  },
  {
    ...propertyField('description', 'general', 'Description', hasProperty, STRING, text),
    options: () => ({ component: 'textarea' }),
  },
  optionField('placeholder', 'general', 'Placeholder', takesPlaceholder, STRING, text),
  {
    key: 'required',
    section: 'validation',
    label: 'Required',
    // Doc 187 rule 29: never for a boolean. Unticking writes `false`, not nothing, so `required` is always satisfied
    // and the toggle would promise a gate that can never fire; "Must be checked" is what an author wants there.
    applies: (ctx) => hasProperty(ctx) && ctx.controlKind !== 'boolean',
    schema: () => BOOLEAN,
    // Doc 188 rule 22: the small renderers/ui Switch.
    options: () => ({ component: 'switch', size: 'sm' }),
    read: (ctx) =>
      Array.isArray(ctx.schema.required) && ctx.propertyKey !== undefined
        ? ctx.schema.required.includes(ctx.propertyKey)
        : false,
    write: (ctx, edit, value) => setRequired(ctx, edit, value === true),
  },
  {
    key: 'mustBeChecked',
    section: 'validation',
    label: 'Must be checked',
    // Doc 187 rule 29: a boolean's counterpart to Required — the box must be TICKED, not merely present.
    applies: (ctx) => hasProperty(ctx) && ctx.controlKind === 'boolean',
    schema: () => BOOLEAN,
    options: () => ({ component: 'switch', size: 'sm' }),
    // Stored as `const: true` on the property (doc 188 rule 23), so Ajv enforces it and so does the API — AND in
    // `required`, because `const` is only evaluated for a property that is PRESENT: an untouched checkbox writes
    // nothing at all, so `const` alone would let an unticked box through (user question 2026-09-17).
    read: (ctx) => ctx.property?.const === true,
    write: (ctx, edit, value) => {
      const on = value === true;
      return setRequired(ctx, setProperty(ctx, edit, 'const', on ? true : undefined), on);
    },
  },
  // Doc 204 rules 9, 9c: a mask IS the length rule, so Max length is HIDDEN BY A RULE while one is set (never
  // dropped from the form — that would remount the Mask field being typed into), and the mask's own write
  // clears the keyword, or Ajv would keep enforcing a length the author can no longer see.
  {
    ...propertyField(
      'maxLength',
      'validation',
      'Max length',
      isText,
      integer({ minimum: 0 }),
      finite,
    ),
    rule: () => HIDE_WHEN_MASKED,
  },
  // Doc 204 rules 6, 9: Mask, then Store unmasked value — a dependent setting always follows the one that
  // reveals it (rule 23).
  ...MASK_FIELDS,
  propertyField('minimum', 'validation', 'Minimum', isNumber, NUMBER, finite),
  propertyField('maximum', 'validation', 'Maximum', isNumber, NUMBER, finite),
  optionField('step', 'validation', 'Step', isNumber, STEP, finite),
  // Doc 204 rules 13-14: Allow decimals, then Decimal places.
  ...NUMBER_VALUE_FIELDS,
  {
    key: 'component',
    section: 'appearance',
    label: 'Component',
    applies: (ctx) => componentsOf(ctx) !== undefined,
    schema: (ctx) => ({
      type: 'string',
      oneOf: (componentsOf(ctx) ?? []).map(({ const: value, title }) => ({ const: value, title })),
    }),
    // No options: a oneOf field renders as the renderers/ui Combobox by default (user request).
    read: currentComponent,
    // Rule 28: the kind's default removes `options.component`.
    write: (ctx, edit, value) =>
      setElement(
        edit,
        withOption(
          edit.element,
          'component',
          value === componentsOf(ctx)?.[0]?.const ? undefined : value,
        ),
      ),
  },
  // Doc 204 rule 16: Style sits in Appearance — it changes how the number reads, not what it accepts.
  ...NUMBER_STYLE_FIELDS,
  optionField('level', 'appearance', 'Heading level', isHeading, wholeNumbers(1, 6), finite),
  optionField('size', 'appearance', 'Heading size', isHeading, wholeNumbers(1, 6), finite),
  // Columns, Gap and Dividers (doc 194 rule 18).
  ...LAYOUT_FIELDS,
  // Doc 212 rules 20-22: after the generic layout settings, since a Section already has Label and Gap from them.
  ...SECTION_FIELDS,
  // Doc 216 rules 6-7: a Tab, for the same reason — Label and Gap already arrive from its layout kind.
  ...TAB_FIELDS,
  {
    key: 'width',
    section: 'layout',
    label: 'Width',
    applies: (ctx) => ctx.maxWidth !== undefined,
    schema: (ctx) => wholeNumbers(1, ctx.maxWidth ?? 1),
    read: (ctx) => {
      const gridItem = optionsOf(ctx.element)['gridItem'];
      return finite(isRecord(gridItem) ? gridItem['w'] : undefined);
    },
    write: (_ctx, edit, value) => setElement(edit, withWidth(edit.element, value)),
  },
] satisfies InspectorField[]);

/** The fields that apply to the element, in rendered order (rules 9-10). */
export function fieldsFor(ctx: InspectorContext): InspectorField[] {
  return INSPECTOR_FIELDS.filter((field) => field.applies(ctx));
}

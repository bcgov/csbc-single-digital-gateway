import type { BaseUISchemaElement, ControlElement, Layout } from '@jsonforms/core';
import type { HeadingLevel } from '@repo/ui/heading';
import type { ComponentMap, GridStackOptions, GridStackWidget } from 'gridstack/dist/react';
import type { LayoutGap } from '../renderers/gridstack/layout-gap';

/** `{ type: 'Heading' }` — a display element rendered by `@repo/ui`'s `Heading` (doc 180). */
export interface HeadingElement extends BaseUISchemaElement {
  type: 'Heading';
  text: string;
  options?: {
    /** Semantic element, `1` → `<h1>`. Anything but an integer 1-6 falls back to `<h1>`. */
    level?: HeadingLevel;
    /** Visual scale, independent of `level`. Anything but an integer 1-6 emits no size class. */
    size?: HeadingLevel;
    [key: string]: unknown;
  };
}

/**
 * `{ type: 'Separator' }` — a horizontal rule rendered by `@repo/ui`'s `Separator` (doc 194). It reads no keys, and is
 * not allowed in a `HorizontalLayout` (use `options.dividers` there).
 */
export interface SeparatorElement extends BaseUISchemaElement {
  type: 'Separator';
}

/** Options every `renderers/ui` control reads. Values of the wrong type are ignored (doc 182). */
interface ControlOptions {
  /** Placeholder text; ignored unless a non-empty string. */
  placeholder?: string;
  [key: string]: unknown;
}

/** A `type: 'string'` control rendered by `@repo/ui`'s `Input` — the default for strings (doc 182). */
export interface InputControlElement extends ControlElement {
  options?: ControlOptions & { component?: 'input' };
}

/** A `type: 'string'` control rendered by `@repo/ui`'s `Textarea` (doc 182). */
export interface TextareaControlElement extends ControlElement {
  options: ControlOptions & { component: 'textarea' };
}

/**
 * A `type: 'number'` control rendered by `@repo/ui`'s `NumberInput` (doc 182). `min`/`max` come from
 * the schema's `minimum`/`maximum`; `step` falls back to the schema's `multipleOf`.
 */
export interface NumberInputControlElement extends ControlElement {
  options?: ControlOptions & {
    component?: 'number';
    step?: number;
    smallStep?: number;
    largeStep?: number;
    /** Ignored when `Intl.NumberFormat` rejects it (with `locale`). */
    format?: Intl.NumberFormatOptions;
    /** Ignored when `Intl.NumberFormat` rejects it. Defaults to the runtime locale. */
    locale?: string;
    allowWheelScrub?: boolean;
    snapOnStep?: boolean;
  };
}

/** A `oneOf` (const/title) control rendered by `@repo/ui`'s `Combobox` — the default for choices (doc 188). */
export interface ComboboxControlElement extends ControlElement {
  options?: ControlOptions & { component?: 'combobox' };
}

/** A `oneOf` (const/title) control rendered as a `@repo/ui` `RadioGroup` (doc 188). */
export interface RadioGroupControlElement extends ControlElement {
  options: ControlOptions & { component: 'radio-group' };
}

/**
 * A MULTI-choice control — `{ type: 'array', items: { oneOf } }` — rendered by `@repo/ui`'s `Combobox` in
 * `multiple` mode, one removable chip per selection. The default for a multi-choice schema (doc 205 rule 5).
 */
export interface MultiComboboxControlElement extends ControlElement {
  options?: ControlOptions & { component?: 'combobox' };
}

/** A multi-choice control rendered as a `@repo/ui` `CheckboxGroup`, one box per option (doc 205 rule 6). */
export interface CheckboxGroupControlElement extends ControlElement {
  options: ControlOptions & { component: 'checkbox-group' };
}

/** A `type: 'boolean'` control rendered by `@repo/ui`'s `Checkbox` — the default for booleans (doc 188). */
export interface CheckboxControlElement extends ControlElement {
  options?: ControlOptions & { component?: 'checkbox' };
}

/** A `type: 'boolean'` control rendered by `@repo/ui`'s `Switch` (doc 188). */
export interface SwitchControlElement extends ControlElement {
  options: ControlOptions & {
    component: 'switch';
    /** `'sm'` renders the small switch; anything else the default size. */
    size?: 'sm' | 'default';
  };
}

/** The space between a layout's children (doc 193): 0 / 0.25 / 0.5 / 1 / 1.5 / 2rem; absent or unknown reads `md`. */
export type LayoutGapOptions = { gap?: LayoutGap };

/**
 * The options an authored `Grid` element may set — everything else is ignored. `margin` is no longer read: the
 * layout's `gap` sets it (doc 193 rule 11).
 */
export type GridElementOptions = Pick<
  GridStackOptions,
  'column' | 'cellHeight' | 'float' | 'minRow' | 'maxRow'
> &
  LayoutGapOptions;

/** Placement of one child inside its `Grid`, read from `child.options.gridItem`. */
export type GridItemPlacement = Pick<
  GridStackWidget,
  'x' | 'y' | 'w' | 'h' | 'minW' | 'maxW' | 'minH' | 'maxH' | 'noMove' | 'noResize' | 'locked'
>;

/** `{ type: 'Grid' }` — a layout whose children are laid out by gridstack.js (doc 180). */
export interface GridElement extends Layout {
  type: 'Grid';
  options?: GridElementOptions & { [key: string]: unknown };
}

/**
 * `{ type: 'VerticalLayout' }` — one gridstack column; children stack in `elements` order and every
 * authored `gridItem` key is ignored (doc 180 rules 23-26).
 */
export interface VerticalLayoutElement extends Layout {
  type: 'VerticalLayout';
  options?: LayoutGapOptions & { [key: string]: unknown };
}

/**
 * `{ type: 'Form' }` — the wrapper of a studio form (doc 192): the root, or a child of a `Stage` (doc 195). It renders
 * exactly like a `VerticalLayout` and reads the same options (none); inside any other layout it renders an error instead
 * of its elements.
 */
export interface FormElement extends Layout {
  type: 'Form';
  label?: string;
  options?: LayoutGapOptions & {
    /**
     * The Form's address (doc 197): stamped on insert as a `nanoid(8)`, unique among the document's Forms, and what a
     * host puts in a URL to open this Form. Optional — a Form without one drills in normally but cannot be linked.
     */
    id?: string;
    /** Doc 201 rule 20: shown under the title. */
    description?: string;
    [key: string]: unknown;
  };
}

/**
 * What a `Clause` tests (doc 199 rules 1, 36). Which operators a field may use is decided by its `ControlKind`
 * in `renderers/xyflow/criteria.ts` — this union is only the vocabulary.
 *
 * `in` / `notIn` are the only operators taking a LIST value, and the only ones a `choice` field offers beyond
 * equality. There are no date operators: `ControlKind` has no date kind for them to attach to (rule 36).
 */
export type Operator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'in'
  | 'notIn'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'isTrue'
  | 'isFalse'
  // Doc 205 rules 27-28: for a MULTI-choice answer. The value is ONE option const and the answer is the array,
  // which is the reverse of `in`/`notIn` ("the scalar answer is one of these") — hence new operators rather
  // than a second meaning for the old ones.
  | 'includes'
  | 'notIncludes';

/**
 * One test inside a `ConditionRow` (doc 199 rule 35). `field` is a top-level schema property KEY, not a
 * `#/properties/…` scope: keys are unique and stable, so a clause pointing at a deleted field is detectably
 * dangling rather than silently wrong.
 *
 * This was `Criterion` before the rows redesign, when one test WAS one branch. The branch is now the row.
 */
export interface Clause {
  id: string;
  field: string;
  operator: Operator;
  /**
   * Absent for the operators `needsValue` reports false for. A LIST only for `in` / `notIn` (rule 36).
   *
   * Doc 206 rule 39: a list entry may be a NUMBER, because a choice option's const may be — a
   * `{ type: 'number', oneOf: [...] }` field is an ordinary choice field.
   */
  value?: string | number | boolean | (string | number)[];
}

/**
 * One branch of a `Condition` (doc 199 rules 35, 38-39): a labelled output holding one or more `Clause`s
 * joined by `match`. `id` is the `sourceHandle` of the edge that leaves this branch, and authored ROW order is
 * evaluation order — the first row whose clauses are satisfied wins.
 */
export interface ConditionRow {
  id: string;
  /** Authored, never derived — `Condition 1`, `Condition 2`, … as `addRow` names them (rule 46). */
  label: string;
  match: 'all' | 'any';
  clauses: Clause[];
}

/**
 * One connection between two nodes of a `Flow`, by their `options.id` (doc 195).
 *
 * Doc 199 rules 10, 37: `sourceHandle` names the `ConditionRow` the edge leaves by. An edge with NO
 * `sourceHandle` is the DEFAULT (Else) path — so it must stay an absent key, never an explicit `undefined`.
 */
export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

/** Where a Stage sits on its Flow's canvas, in canvas pixels. */
export interface StagePosition {
  x: number;
  y: number;
}

/**
 * `{ type: 'Stage' }` — one position in a multi-stage form, drawn as a node of its `Flow` and holding that stage's
 * `Form`s (doc 195). Only allowed in a Flow. A Stage without a valid `position` is placed automatically.
 */
export interface StageElement extends Layout {
  type: 'Stage';
  label?: string;
  elements: FormElement[];
  options: { id: string; position?: StagePosition; [key: string]: unknown };
}

/**
 * `{ type: 'Condition' }` — a branching node of a `Flow` (doc 199). Each `ConditionRow` owns one output, whose
 * id is the `sourceHandle` of the edge leaving it; an edge from this node with no `sourceHandle` is the Else
 * path, which every Condition must have.
 *
 * It extends `BaseUISchemaElement`, NOT `Layout`: a Condition holds no children. `options` is required, as a
 * `Stage`'s is, because its `id` is what edges address.
 *
 * Doc 199 rule 35: `rows` REPLACES the pre-2026-09-17 `criteria`, and nothing reads `criteria` any more — a
 * document still authoring it draws a Condition with no branches rather than having a row label and a `match`
 * invented for it.
 */
export interface ConditionElement extends BaseUISchemaElement {
  type: 'Condition';
  label?: string;
  options: {
    id: string;
    rows: ConditionRow[];
    position?: StagePosition;
    [key: string]: unknown;
  };
}

/**
 * `{ type: 'Flow' }` — a root-only multi-stage form drawn with `@xyflow/react` (doc 195): its `Stage`s and
 * `Condition`s are the nodes and `options.edges` connects them. Edges with an unknown end, self-loops and repeats
 * are not drawn.
 */
export interface FlowElement extends Layout {
  type: 'Flow';
  label?: string;
  elements: (StageElement | ConditionElement)[];
  options?: {
    edges?: FlowEdge[];
    /**
     * Doc 203 rules 1-3: the `options.id` of the Stage the flow starts at. When it is absent — or names
     * no drawn Stage — the flow starts at its first Stage in `elements` order.
     */
    startId?: string;
    [key: string]: unknown;
  };
}

/** The options a `HorizontalLayout` reads — everything else is ignored (doc 180 rule 27, doc 193). */
export interface HorizontalLayoutOptions extends LayoutGapOptions {
  /** Columns in the row, 2-6. Anything else falls back to the child count, clamped to 2-6. */
  columns?: 2 | 3 | 4 | 5 | 6;
  /** Draw a vertical rule between the children (doc 194). Only `true` turns it on. */
  dividers?: boolean;
}

/**
 * `{ type: 'HorizontalLayout' }` — one gridstack row; children run left to right in `elements` order,
 * each `options.gridItem.w` columns wide (default 1). No other `gridItem` key is read (doc 180 rule 28).
 */
export interface HorizontalLayoutElement extends Layout {
  type: 'HorizontalLayout';
  options?: HorizontalLayoutOptions & { [key: string]: unknown };
}

/** `{ type: 'PaletteItem' }` — one draggable, activatable Form Studio palette entry (doc 189). */
export interface PaletteItemElement extends BaseUISchemaElement {
  type: 'PaletteItem';
  /** The catalogue key the item inserts. */
  template: string;
  label: string;
  options?: {
    /** An `@mdi/js` icon path; ignored unless a non-empty string. */
    icon?: string;
    /** Extra search terms; entries that are not strings are ignored. */
    keywords?: string[];
    [key: string]: unknown;
  };
}

/** `{ type: 'PaletteGroup' }` — a labelled group of palette items (doc 189). */
export interface PaletteGroupElement extends Layout {
  type: 'PaletteGroup';
  label: string;
  elements: PaletteItemElement[];
}

/** `{ type: 'PaletteEmpty' }` — the palette's message when the search matches nothing (doc 189). */
export interface PaletteEmptyElement extends BaseUISchemaElement {
  type: 'PaletteEmpty';
  text: string;
}

/** GridStack options a consumer may pass to the factory — the widgets always come from `elements`. */
export type GridStackLayoutOptions = Omit<GridStackOptions, 'children' | 'subGridOpts'>;

/** Options for `createGridRenderers` (`@repo/forms/renderers/gridstack`). */
export interface GridRenderersOptions {
  /**
   * Merged over the built-in components map. An entry under `GRID_ELEMENT_COMPONENT` replaces the
   * built-in grid item renderer (e.g. to add a drag handle around `GridElementDispatch`).
   */
  components?: ComponentMap;
  /**
   * Overrides the built-in defaults
   * `{ column: 12, cellHeight: '1rem', margin: '0.5rem', staticGrid: true, sizeToContent: true }`.
   */
  gridOptions?: GridStackLayoutOptions;
  /** Extra classes on the `.grid-stack` root — how a consumer styles its items (doc 180 rule 7). */
  className?: string;
}

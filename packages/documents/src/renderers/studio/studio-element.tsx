import type { JsonFormsRendererRegistryEntry, UISchemaElement } from '@jsonforms/core';
import {
  createContext,
  createElement,
  useContext,
  type ComponentType,
  type ReactNode,
} from 'react';
import { ElementActions, elementName } from './element-actions';
import { idOf } from './element-order';
import { isMultiChoice, isSingleChoice } from '../ui/choice-options';
import { RuleBadge, ruleOf } from './rule-badge';
import { useStudioEditor } from './studio-editor';

/** How many StudioElements enclose this point: 0 is the root, which renders bare (doc 236 rule 17). */
const DepthContext = createContext(0);

export interface StudioElementState {
  id: string;
  selected: boolean;
}

const ElementContext = createContext<StudioElementState | null>(null);

/** The enclosing wrapped element's id and selection (rule 19); `null` for a bare one. */
export function useStudioElement(): StudioElementState | null {
  return useContext(ElementContext);
}

/**
 * Pressable studio content inside the xyflow canvas (rule 20): the canvas neither drags the page node nor pans under
 * it, keys are not taken by xyflow, and clicks get through the page's `pointer-events-none`.
 */
export const STUDIO_INTERACTIVE = 'nodrag nopan nokey pointer-events-auto';

/**
 * Every studio element's inset inside its frame (doc 254 rule 7): roomy enough that the 24px action bar below the
 * element reads as belonging to it. One constant, so a control's body, a Heading, Rich content and a Separator agree.
 */
export const ELEMENT_INSET = 'p-4';

/**
 * Every wrapped element's frame (doc 236 rule 16b): a dashed outline by default, dashed blue on hover, offset clear of the
 * content, and none while selected — the ring replaces it. An outline, not a border, so framing never moves anything.
 */
const ELEMENT_FRAME =
  // Square corners: the dashed frame and the selection ring both follow the wrapper's (none). A rule in error draws the
  // frame solid in the warning colour (doc 256 rule 6), selected or not.
  'outline outline-1 outline-dashed outline-border outline-offset-4 hover:outline-ring data-[selected]:outline-none data-[rule-error]:outline-2 data-[rule-error]:outline-solid data-[rule-error]:outline-warning-border data-[rule-error]:hover:outline-warning-border';

/**
 * The selected element's ring — the canvas nodes' own selection ring (`SELECTED_CLASS` in studio/node-parts.tsx),
 * under `data-[selected]:`. Literal classes, so Tailwind sees them; a test pins that they match the node's.
 */
export const SELECTED_RING =
  'data-[selected]:ring-2 data-[selected]:ring-ring data-[selected]:ring-offset-2 data-[selected]:ring-offset-background';

/**
 * Wraps one studio element (doc 236 rules 15-18): an outline on hover, a ring when selected, and a click that selects
 * it — stopped, so the innermost element wins. The root, and an element with no id, render bare.
 */
export function StudioElement({
  uischema,
  schema,
  inert = false,
  children: content,
}: {
  uischema: UISchemaElement;
  /** The schema JSONForms dispatched with: names a Control on its actions by its property's title (doc 242 rule 2). */
  schema?: unknown;
  /**
   * Draw the element but never let it be used (doc 237 rule 13): a control is authored here, not filled in. Inert
   * content is skipped by hit-testing and focus, so a click anywhere on it lands on the wrapper and only selects.
   */
  inert?: boolean;
  children: ReactNode;
}) {
  const children = inert ? (
    // Padded, so the selection ring and hover outline sit clear of the control (doc 237 rule 13b).
    <div data-slot="studio-element-body" inert className={ELEMENT_INSET}>
      {content}
    </div>
  ) : (
    content
  );
  const depth = useContext(DepthContext);
  const editor = useStudioEditor();
  const id = idOf(uischema);
  if (depth === 0 || id === undefined) {
    return (
      <DepthContext.Provider value={depth + 1}>
        <ElementContext.Provider value={null}>{children}</ElementContext.Provider>
      </DepthContext.Provider>
    );
  }
  const selected = editor?.selectedId === id;
  // Doc 256: the element's rule (moved aside on the canvas), and whether it tests a field it may not.
  const rule = ruleOf(uischema);
  const inError = rule !== undefined && (editor?.ruleProblems?.(id).length ?? 0) > 0;
  // A choice field opens its options editor from a double-click and its action bar (doc 255 rule 3).
  const openOptions =
    editor?.editOptions !== undefined && isChoiceControl(uischema, schema)
      ? () => editor.editOptions?.(id)
      : undefined;
  return (
    <DepthContext.Provider value={depth + 1}>
      <ElementContext.Provider value={{ id, selected }}>
        <div
          data-slot="studio-element"
          data-element-id={id}
          data-element-type={uischema.type}
          data-selected={selected ? '' : undefined}
          data-rule-error={inError ? '' : undefined}
          onClick={
            editor === null
              ? undefined
              : (event) => {
                  event.stopPropagation();
                  editor.select(id);
                }
          }
          onDoubleClick={
            openOptions === undefined
              ? undefined
              : (event) => {
                  event.stopPropagation();
                  openOptions();
                }
          }
          className={
            editor === null
              ? undefined
              : `relative ${STUDIO_INTERACTIVE} ${ELEMENT_FRAME} ${SELECTED_RING}`
          }
        >
          {children}
          {rule !== undefined && <RuleBadge rule={rule} inError={inError} />}
          {editor !== null &&
            (editor.remove !== undefined ||
              editor.copy !== undefined ||
              editor.editRule !== undefined ||
              openOptions !== undefined) && (
              <ElementActions
                name={elementName(uischema, schema)}
                hasRule={rule !== undefined}
                {...(editor.editRule !== undefined && { onEditRule: () => editor.editRule?.(id) })}
                {...(openOptions !== undefined && { onEditOptions: openOptions })}
                {...(editor.copy !== undefined && {
                  // The copy is selected, like a moved element (doc 254 rule 6).
                  onCopy: () => {
                    const copyId = editor.copy?.(id);
                    if (copyId !== undefined) editor.select(copyId);
                  },
                })}
                {...(editor.remove !== undefined && {
                  onDelete: () => editor.remove?.(id, elementName(uischema, schema)),
                })}
              />
            )}
        </div>
      </ElementContext.Provider>
    </DepthContext.Provider>
  );
}

/** `entry` with its renderer drawn inside a StudioElement — `inert` for controls; the tester is kept (rule 15). */
export function withStudioElement(
  entry: JsonFormsRendererRegistryEntry,
  { inert = false }: { inert?: boolean } = {},
): JsonFormsRendererRegistryEntry {
  const Renderer = entry.renderer as ComponentType<{ uischema: UISchemaElement }>;
  function Wrapped(props: { uischema: UISchemaElement; schema?: unknown }) {
    return (
      <StudioElement uischema={props.uischema} schema={props.schema} inert={inert}>
        {createElement(Renderer, props)}
      </StudioElement>
    );
  }
  return { tester: entry.tester, renderer: Wrapped };
}

const PROPERTY_SCOPE = /^#\/properties\/([^/]+)$/;

/** Whether `uischema` is a Control over a single or multiple choice property of `schema` (doc 255 rule 1). */
function isChoiceControl(uischema: UISchemaElement, schema: unknown): boolean {
  const scope = (uischema as { scope?: unknown }).scope;
  const key =
    uischema.type === 'Control' && typeof scope === 'string'
      ? PROPERTY_SCOPE.exec(scope)?.[1]
      : undefined;
  if (key === undefined) return false;
  const property = (schema as { properties?: Record<string, unknown> } | undefined)?.properties?.[
    key
  ];
  return isSingleChoice(property) || isMultiChoice(property);
}

import type { JsonFormsRendererRegistryEntry, UISchemaElement } from '@jsonforms/core';
import {
  createContext,
  createElement,
  useContext,
  type ComponentType,
  type ReactNode,
} from 'react';
import { idOf } from './element-order';
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

/** A faint outline on hover, offset clear of the content. */
const HOVER_OUTLINE =
  'rounded-sm outline-offset-4 hover:outline hover:outline-1 hover:outline-border';

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
  inert = false,
  children: content,
}: {
  uischema: UISchemaElement;
  /**
   * Draw the element but never let it be used (doc 237 rule 13): a control is authored here, not filled in. Inert
   * content is skipped by hit-testing and focus, so a click anywhere on it lands on the wrapper and only selects.
   */
  inert?: boolean;
  children: ReactNode;
}) {
  const children = inert ? (
    // Padded, so the selection ring and hover outline sit clear of the control (doc 237 rule 13b).
    <div data-slot="studio-element-body" inert className="p-2">
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
  return (
    <DepthContext.Provider value={depth + 1}>
      <ElementContext.Provider value={{ id, selected }}>
        <div
          data-slot="studio-element"
          data-element-id={id}
          data-element-type={uischema.type}
          data-selected={selected ? '' : undefined}
          onClick={
            editor === null
              ? undefined
              : (event) => {
                  event.stopPropagation();
                  editor.select(id);
                }
          }
          className={
            editor === null ? undefined : `${STUDIO_INTERACTIVE} ${HOVER_OUTLINE} ${SELECTED_RING}`
          }
        >
          {children}
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
  function Wrapped(props: { uischema: UISchemaElement }) {
    return (
      <StudioElement uischema={props.uischema} inert={inert}>
        {createElement(Renderer, props)}
      </StudioElement>
    );
  }
  return { tester: entry.tester, renderer: Wrapped };
}

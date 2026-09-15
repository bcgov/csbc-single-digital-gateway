import { GridStack, type GridItemHTMLElement, type GridStackWidget } from 'gridstack';

// Dragging elements from outside every grid into an editable one (doc 189 rules 12-15). Studio-agnostic: a drag-in
// source carries only a template key, which the grid reports in an `insert` gesture for its editor to interpret.

/** Marks an element registered as a drag-in source; editable grids accept drops from it (rule 13). */
export const DRAG_IN_ATTRIBUTE = 'data-grid-drag-in';

/** The key a drag-in widget carries its template under — gridstack keeps non-`_` keys on the dropped node. */
const TEMPLATE_KEY = 'dragInTemplate';

/**
 * Registers `element` as a gridstack drag-in source for `template` (rule 12): dragging it moves a clone under
 * `body`, and dropping it on an editable grid reports an `insert` gesture. The widget is sized `w: 12, h: 4` —
 * gridstack would otherwise size it from the clone's pixels — and each grid clamps the width to its columns.
 * The height only sizes the drop placeholder (the dropped widget is replaced by the element, sized to content):
 * gridstack insets the grey placeholder by the item margin on every side, so one 1rem row minus two 0.5rem margins
 * would draw nothing (bug B1). Returns the cleanup, which destroys the draggable and removes the marker.
 */
export function setupGridDragIn(element: HTMLElement, template: string): () => void {
  element.setAttribute(DRAG_IN_ATTRIBUTE, '');
  const widget = { w: 12, h: 4, [TEMPLATE_KEY]: template } as GridStackWidget;
  GridStack.setupDragIn([element], { appendTo: 'body', helper: 'clone' }, [widget]);
  return () => {
    GridStack.getDD().draggable(element as GridItemHTMLElement, 'destroy');
    element.removeAttribute(DRAG_IN_ATTRIBUTE);
  };
}

/** The template a dropped node carries, when a non-empty string (rule 12). */
export function dragInTemplateOf(node: unknown): string | undefined {
  if (typeof node !== 'object' || node === null) return undefined;
  const template = (node as Record<string, unknown>)[TEMPLATE_KEY];
  return typeof template === 'string' && template.length > 0 ? template : undefined;
}

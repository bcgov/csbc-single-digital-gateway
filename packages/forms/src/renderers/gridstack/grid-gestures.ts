import type { UISchemaElement } from '@jsonforms/core';
import type { GridItemHTMLElement, GridStack, GridStackNode } from 'gridstack';
import type { GridStackHandle } from 'gridstack/dist/react';
import { useEffect, type RefObject } from 'react';
import { dragInTemplateOf } from './grid-drag-in';
import type { GridEditor, LayoutNode } from './grid-editor';

// The uischema Grid each mounted editable GridStack renders, so a drop can name its source grid.
const gridIds = new WeakMap<GridStack, string>();

/** A gridstack engine node as a `LayoutNode`; absent `h`/`minH` stay absent. */
export function toLayoutNode(node: GridStackNode): LayoutNode {
  return {
    id: String(node.id),
    x: node.x ?? 0,
    y: node.y ?? 0,
    w: node.w ?? 1,
    ...(node.h === undefined ? {} : { h: node.h }),
    ...(node.minH === undefined ? {} : { minH: node.minH }),
  };
}

const nodesOf = (grid: GridStack) => grid.engine.nodes.map(toLayoutNode);

/**
 * Reports gestures on an editable Grid to its editor (doc 183 rules 8-10, 15; doc 185 rule 10).
 *
 * Finished gestures come only from `dragstop`, `resizestop` and `dropped` — never `change`, which also
 * fires for size-to-content and `load`, so writing a gesture back can never echo into another gesture.
 * `dragstart` / `resizestart` and every stop or drop also report whether a gesture is in progress. A drop
 * from another grid first removes gridstack's moved DOM node: the React wrapper already unmounted its
 * content when it left the source grid, and the state update re-adds the item through `load`, which
 * renders its content.
 *
 * A drop from outside every grid (doc 189 rules 14-15) removes gridstack's new widget the same way, and reports an
 * `insert` gesture when the dropped node carries a drag-in template — otherwise nothing.
 */
export function useGridGestures(
  handle: RefObject<GridStackHandle | null>,
  editor: GridEditor | null,
  gridElement: UISchemaElement,
  visible: boolean,
) {
  useEffect(() => {
    const grid = handle.current?.getGrid();
    if (!editor || !grid) return;
    const gridId = editor.idOf(gridElement);
    gridIds.set(grid, gridId);

    const onStart = () => editor.onGestureActive?.(true);

    const onStop = (_event: Event, el: GridItemHTMLElement) => {
      editor.onGestureActive?.(false);
      // A gesture that ended in another grid is reported by that grid's `dropped`.
      if (el.gridstackNode?.grid !== grid) return;
      editor.onGesture({ type: 'layout', gridId, nodes: nodesOf(grid) });
    };

    const onDropIn = (next: GridStackNode) => {
      const template = dragInTemplateOf(next);
      const nodes = grid.engine.nodes.filter((node) => node !== next).map(toLayoutNode);
      if (next.el) grid.removeWidget(next.el, true, false);
      if (template === undefined) return;
      const placement = { x: next.x ?? 0, y: next.y ?? 0, w: next.w ?? 1 };
      editor.onGesture({ type: 'insert', template, gridId, placement, nodes });
    };

    const onDropped = (_event: Event, previous: GridStackNode | undefined, next: GridStackNode) => {
      editor.onGestureActive?.(false);
      const from = previous?.grid;
      if (!from) {
        onDropIn(next);
        return;
      }
      const fromGridId = gridIds.get(from);
      if (from === grid || !fromGridId || next.id === undefined) return;
      const fromNodes = nodesOf(from);
      const toNodes = nodesOf(grid);
      if (next.el) grid.removeWidget(next.el, true, false);
      editor.onGesture({
        type: 'move',
        elementId: String(next.id),
        fromGridId,
        toGridId: gridId,
        fromNodes,
        toNodes,
      });
    };

    grid.on('dragstart', onStart);
    grid.on('resizestart', onStart);
    grid.on('dragstop', onStop);
    grid.on('resizestop', onStop);
    grid.on('dropped', onDropped);
    return () => {
      grid.off('dragstart');
      grid.off('resizestart');
      grid.off('dragstop');
      grid.off('resizestop');
      grid.off('dropped');
      gridIds.delete(grid);
    };
  }, [handle, editor, gridElement, visible]);
}

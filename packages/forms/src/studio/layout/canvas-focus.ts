import type { UISchemaElement } from '@jsonforms/core';
import { FORM_TYPE } from '../../renderers/gridstack/grid-layouts';
import { FLOW_TYPE } from '../../renderers/xyflow/flow-elements';
import type { ElementIds } from './element-ids';
import { elementPath } from './element-path';
import type { TreeElement } from './element-tree';

/**
 * Doc 196 rule 12: the Form the studio canvas shows — for a Flow root, the id of the nearest Form at or above the
 * selection; otherwise, or when nothing (or nothing inside a Form) is selected, `null`, and the canvas shows the whole
 * document.
 */
export function canvasFocusId(
  root: UISchemaElement,
  selectedId: string | null,
  ids: ElementIds,
): string | null {
  if (root.type !== FLOW_TYPE || selectedId === null) return null;
  const path = elementPath(root as TreeElement, selectedId, ids);
  const form = path.findLast((element) => element.type === FORM_TYPE);
  return form ? ids.idOf(form) : null;
}

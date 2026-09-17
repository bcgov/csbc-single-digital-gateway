import type { UISchemaElement } from '@jsonforms/core';
import { labelOf } from '../renderers/gridstack/element-label';
import { FORM_TYPE } from '../renderers/gridstack/grid-layouts';
import { drawnStages, elementsOf } from '../renderers/xyflow/flow-elements';
import type { ElementIds } from './layout/element-ids';

// The Forms a multi-stage document offers to preview one at a time, grouped by Stage (doc 184 rules 20, 20c). PURE.

export interface PreviewableForm {
  /** The studio element id — what `select` and the preview focus address (doc 196 rule 12). */
  readonly id: string;
  /** `labelOf(form, 'Form')`, the name the author gave it (doc 201 rule 1). */
  readonly label: string;
}

/** Doc 184 rule 20c: one Stage's Forms, under that Stage's name. */
export interface PreviewableStage {
  /** `labelOf(stage, 'Stage')` — the menu's section header. */
  readonly label: string;
  readonly forms: readonly PreviewableForm[];
}

/**
 * Doc 184 rules 20, 20c: the Forms of a `Flow`, GROUPED BY STAGE, in stage order then element order. A Stage holding no
 * Forms contributes no group, since an empty section would name a stage with nothing to preview.
 *
 * A `Form` document has exactly one Form — the document itself, which the Preview button already previews — so it
 * offers no groups at all.
 */
export function previewableStages(uischema: UISchemaElement, ids: ElementIds): PreviewableStage[] {
  if (uischema.type === FORM_TYPE) return [];
  return drawnStages(uischema).flatMap(({ element }) => {
    const forms = elementsOf(element)
      .filter((child) => child.type === FORM_TYPE)
      .map((form) => ({ id: ids.idOf(form), label: labelOf(form, 'Form') }));
    return forms.length === 0 ? [] : [{ label: labelOf(element, 'Stage'), forms }];
  });
}

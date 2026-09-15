import type { RendererSet } from '../../types/renderer-set';
import * as ui from '../ui/index';
import { fillFlowRenderers } from './fill-flow';
import { fillLayoutRenderers } from './fill-layouts';

// Renderers for user-fillable forms (doc 180 rule 14, doc 193 rule 3): @repo/ui renderers plus plain CSS layouts — no
// gridstack, so items are not inset by grid margins and heights fit their content. The gridstack factory's one
// public home is @repo/forms/renderers/gridstack; it is not re-exported here. A new source set is spread here AND in
// renderers/studio — except renderers/xyflow: fillable forms show a Flow as not yet supported (doc 195 rule 19).

export const cells: RendererSet['cells'] = [...ui.cells];

export const controlRenderers: RendererSet['controlRenderers'] = [...ui.controlRenderers];

export const displayRenderers: RendererSet['displayRenderers'] = [...ui.displayRenderers];

export const layoutRenderers: RendererSet['layoutRenderers'] = [
  ...ui.layoutRenderers,
  ...fillLayoutRenderers,
  ...fillFlowRenderers,
];

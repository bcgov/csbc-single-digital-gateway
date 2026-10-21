import type { RendererSet } from '../../types/renderer-set';
import { ConditionLayoutRenderer } from './condition-renderer';
import { conditionTester, flowTester, stageTester } from './flow-elements';
import { FlowLayoutRenderer } from './flow-renderer';
import { StageLayoutRenderer } from './stage-renderer';

// Multi-stage form layouts drawn with @xyflow/react (doc 195 rules 2, 4; doc 199 rule 17): a root-only Flow canvas
// whose nodes are Stage cards and Condition cards. Spread into renderers/studio; fillable forms (renderers/default)
// show a Flow as not yet supported instead.

export const cells: RendererSet['cells'] = [];

export const controlRenderers: RendererSet['controlRenderers'] = [];

export const displayRenderers: RendererSet['displayRenderers'] = [];

export const layoutRenderers: RendererSet['layoutRenderers'] = [
  { tester: flowTester, renderer: FlowLayoutRenderer },
  { tester: stageTester, renderer: StageLayoutRenderer },
  { tester: conditionTester, renderer: ConditionLayoutRenderer },
];

import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import type { CriterionField } from '../../renderers/xyflow/criteria';
import { drawnNodes, elementsOf } from '../../renderers/xyflow/flow-elements';
import { flowEdges, reachesNode } from '../../renderers/xyflow/flow-graph';
import { choiceOptions } from '../../renderers/ui/choice-control';
import { multiChoiceOptions } from '../../renderers/ui/multi-choice-control';
import { controlKindOf } from '../../renderers/ui/control-kind';
import { elementLabel } from './element-path';
import { propertyKeyOf, type StudioDocument } from './schema-properties';

// The fields a Condition may test (doc 199 rules 6-9). Pure — no React.
//
// This lives in the studio, not in `renderers/xyflow`, because resolving a Control to a schema property needs
// `propertyKeyOf`; `renderers/xyflow` may never import the studio. It is also why the criterion half of rule 13
// is checked here rather than in `flowProblems`, which is given no schema.

/** Every Control in `element`'s subtree, in document order. */
function controlsIn(element: UISchemaElement): UISchemaElement[] {
  const controls: UISchemaElement[] = [];
  const visit = (current: UISchemaElement) => {
    if (current.type === 'Control') controls.push(current);
    for (const child of elementsOf(current)) visit(child);
  };
  visit(element);
  return controls;
}

/**
 * A Control as a criterion field, or `undefined` when it binds to no known property or to one of a type no
 * operator set covers (rule 1).
 */
function fieldOf(control: UISchemaElement, schema: JsonSchema): CriterionField | undefined {
  const key = propertyKeyOf(control, schema);
  if (key === undefined) return undefined;
  const property = schema.properties?.[key];
  const kind = controlKindOf(property);
  if (kind === undefined) return undefined;

  // `elementLabel` falls back to the element TYPE, which would show a field picker the word "Control".
  // Rule 6 wants the authored name, so an unnamed field is named by its key instead.
  const labelled = elementLabel(control, schema);
  const label = labelled === control.type ? key : labelled;
  // Doc 205 rule 31: a multi-choice field carries its options too — the picker offers the same list, and an
  // `includes` clause's value is one of them.
  const options =
    kind === 'choice'
      ? choiceOptions(property)
      : kind === 'multi-choice'
        ? multiChoiceOptions(property)
        : undefined;
  return options === undefined ? { key, label, kind } : { key, label, kind, options };
}

/**
 * Rules 6-8: the fields answerable before reaching `nodeId` — every Stage that REACHES it, walked to its Forms'
 * Controls, in `elements` order and then document order.
 *
 * Reachability reads the SANITISED `flowEdges`, so an edge the sanitiser drops (an unknown end, a self-loop, a
 * handle naming no criterion) never makes a field look answerable. A node with no authored id is unreachable by
 * definition — no edge can address it — so it contributes nothing, and neither does the node itself: a Condition
 * cannot test an answer given at or after its own branch.
 *
 * The same key can be bound by only one Control (`newPropertyKey` is unique per insert), but a duplicate is
 * tolerated first-wins rather than producing two identically-keyed entries.
 */
export function upstreamFieldsOf(document: StudioDocument, nodeId: string): CriterionField[] {
  const { schema, uischema } = document;
  const edges = flowEdges(uischema);
  const nodes = drawnNodes(uischema);
  if (!nodes.some(({ id, authored }) => authored && id === nodeId)) return [];

  const seen = new Set<string>();
  const fields: CriterionField[] = [];
  for (const { element, id, authored, kind } of nodes) {
    // Only a Stage holds Forms, and only an upstream one has been answered. `reachesNode` includes the node
    // itself, so `id !== nodeId` excludes the Condition's own position.
    if (!authored || kind !== 'stage' || id === nodeId) continue;
    if (!reachesNode(edges, id, nodeId)) continue;
    for (const control of controlsIn(element)) {
      const field = fieldOf(control, schema);
      if (!field || seen.has(field.key)) continue;
      seen.add(field.key);
      fields.push(field);
    }
  }
  return fields;
}

import type { JsonFormsRendererRegistryEntry, LayoutProps } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import {
  FLOW_UNSUPPORTED_MESSAGE,
  flowTester,
  STAGE_PLACEMENT_MESSAGE,
  stageTester,
} from '../xyflow/flow-elements';

// Flows in fillable forms (doc 195 rule 19): not supported yet. Only the pure renderers/xyflow module is imported, so
// fillable forms never load @xyflow/react.

/** A Flow: a status message in place of the form. */
function FillFlow({ visible }: LayoutProps) {
  if (!visible) return null;
  return (
    <p role="status" data-slot="flow-unsupported" className="text-sm text-muted-foreground">
      {FLOW_UNSUPPORTED_MESSAGE}
    </p>
  );
}

/** A Stage: only a Flow may hold one, and fillable forms never draw a Flow's Stages. */
function FillStage() {
  return (
    <p role="alert" data-slot="stage-placement-error" className="text-sm text-destructive">
      {STAGE_PLACEMENT_MESSAGE}
    </p>
  );
}

export const fillFlowRenderers: readonly JsonFormsRendererRegistryEntry[] = Object.freeze([
  { tester: flowTester, renderer: withJsonFormsLayoutProps(FillFlow) },
  { tester: stageTester, renderer: withJsonFormsLayoutProps(FillStage) },
]);

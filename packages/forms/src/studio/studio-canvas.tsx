import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import * as defaultSet from '../renderers/default/index';
import { GridEditorProvider, type GridEditor } from '../renderers/gridstack/grid-editor';
import { FORM_TYPE } from '../renderers/gridstack/grid-layouts';
import * as studioSet from '../renderers/studio/index';
import {
  StudioSelectionProvider,
  type StudioSelection,
} from '../renderers/studio/studio-selection';
import { FlowEditorProvider, type FlowEditor } from '../renderers/xyflow/flow-editor';
import { FLOW_TYPE } from '../renderers/xyflow/flow-elements';
import { StudioEmptyState } from './document/studio-empty-state';
import type { DocumentSessionStatus } from './document/use-document-session';
import { STUDIO_SAMPLE_DATA } from './sample';

// Built once at module load — a new array per render would make JSONForms re-dispatch everything.
const STUDIO_RENDERERS = [
  ...studioSet.controlRenderers,
  ...studioSet.displayRenderers,
  ...studioSet.layoutRenderers,
];
const PREVIEW_RENDERERS = [
  ...defaultSet.controlRenderers,
  ...defaultSet.displayRenderers,
  ...defaultSet.layoutRenderers,
];

const ROOT_MESSAGE = 'The root element must be a Form or a Flow.';
/** Doc 192 rule 7, doc 195 rule 21: the uischema types a studio document's root may have. */
const ROOT_TYPES: ReadonlySet<string> = new Set([FORM_TYPE, FLOW_TYPE]);

export interface StudioCanvasProps {
  readonly schema: JsonSchema;
  /** The document's root — what the root check reads. */
  readonly uischema: UISchemaElement;
  /** What the studio canvas renders: the document, or the focused Form (doc 196 rule 12). */
  readonly canvasRoot: UISchemaElement;
  /** What preview renders: the document, or the Form focused when preview started (doc 196 rule 16). */
  readonly previewRoot: UISchemaElement;
  /** Changes when the canvas root does, so each root mounts its own JSONForms. */
  readonly rootKey: string;
  readonly previewing: boolean;
  readonly selection: StudioSelection;
  readonly editor: GridEditor;
  readonly flowEditor: FlowEditor;
  /** Whether there is a document to draw at all (doc 200 rule 15). */
  readonly status: DocumentSessionStatus;
  /** Why the load failed, when it did (doc 200 rule 5). */
  readonly reason: string | null;
  onNewForm(): void;
  onRetry(): void;
}

/**
 * The centre panel's content: the canvas root through the studio renderers under the selection port and the Grid and
 * Flow editors, or the preview root through the fillable default renderers in preview (doc 184) — or, when the document
 * root is neither a Form nor a Flow, the root error in its place in both (doc 192 rule 7, doc 195 rule 21). A focused
 * Form is rendered as a root, so it draws — and nests its own check — exactly like a Form document.
 */
export function StudioCanvas({
  schema,
  uischema,
  canvasRoot,
  previewRoot,
  rootKey,
  previewing,
  selection,
  editor,
  flowEditor,
  status,
  reason,
  onNewForm,
  onRetry,
}: StudioCanvasProps) {
  // Doc 200 rule 15: no document yet — the empty, loading and failed states sit in the same early-return position as
  // the root check, so this component stays the ONE place that decides what occupies the centre.
  if (status !== 'ready') {
    return (
      <StudioEmptyState status={status} reason={reason} onNewForm={onNewForm} onRetry={onRetry} />
    );
  }
  if (!ROOT_TYPES.has(uischema.type)) {
    return (
      <p role="alert" data-slot="form-studio-root-error" className="text-sm text-destructive">
        {ROOT_MESSAGE}
      </p>
    );
  }
  if (previewing) {
    return (
      <JsonForms
        key={`preview-${rootKey}`}
        schema={schema}
        uischema={previewRoot}
        data={STUDIO_SAMPLE_DATA}
        renderers={PREVIEW_RENDERERS}
        cells={defaultSet.cells}
      />
    );
  }
  return (
    <StudioSelectionProvider value={selection}>
      <GridEditorProvider value={editor}>
        <FlowEditorProvider value={flowEditor}>
          <JsonForms
            key={`studio-${rootKey}`}
            schema={schema}
            uischema={canvasRoot}
            data={STUDIO_SAMPLE_DATA}
            renderers={STUDIO_RENDERERS}
            cells={studioSet.cells}
            validationMode="NoValidation"
          />
        </FlowEditorProvider>
      </GridEditorProvider>
    </StudioSelectionProvider>
  );
}

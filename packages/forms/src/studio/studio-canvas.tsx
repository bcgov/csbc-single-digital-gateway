import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { useState } from 'react';
import { FormRunner } from '../runner/form-runner';
import * as defaultSet from '../renderers/default/index';
import { GridEditorProvider, type GridEditor } from '../renderers/gridstack/grid-editor';
import { TabsEditorProvider, type TabsEditor } from '../renderers/gridstack/tabs-editor';
import { type TabsComponent } from '../renderers/gridstack/tabs-options';
import { TabsOverrideProvider } from '../renderers/gridstack/tabs-override';
import { InlineValue } from '../renderers/studio/inline-value';
import { InlineEditableProvider } from '../renderers/ui/inline-editable';
import { FORM_TYPE, isPageRoot, SERVICE_TYPE } from '../renderers/gridstack/grid-layouts';
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
import { VIEWPORT_WIDTH, type PreviewViewport } from './viewport-toggles';
import type { PreviewMode } from './preview-mode-toggles';
import { SubmissionView } from '../runner/submission-view';

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

const ROOT_MESSAGE = 'The root element must be a Form, a Service or a Flow.';
/** Doc 192 rule 7, doc 195 rule 21, doc 215 rule 12: the uischema types a studio document's root may have. */
const ROOT_TYPES: ReadonlySet<string> = new Set([FORM_TYPE, SERVICE_TYPE, FLOW_TYPE]);

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
  /** Doc 184 rule 17: the width preview's frame is capped to. */
  readonly viewport: PreviewViewport;
  /** Doc 211 rule 27: whether preview shows the form to FILL IN or the answers to READ. */
  readonly previewMode: PreviewMode;
  /** Doc 216 rules 31-32: the component preview forces, or `null` to draw every Tabs as authored. */
  readonly tabs: TabsComponent | null;
  readonly selection: StudioSelection;
  readonly editor: GridEditor;
  readonly flowEditor: FlowEditor;
  /** Doc 216 rule 14: present ONLY here — a preview or a fillable form has no provider, so its strip is static. */
  readonly tabsEditor: TabsEditor;
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
  viewport,
  previewMode,
  tabs,
  selection,
  editor,
  flowEditor,
  tabsEditor,
  status,
  reason,
  onNewForm,
  onRetry,
}: StudioCanvasProps) {
  // Doc 202 rule 40b: previewing a Flow mounts the RUNNER, which takes controlled answers (rule 3) — so preview
  // needs somewhere to put them. Declared ABOVE every early return: a hook may not sit behind a condition (the
  // temporal-dead-zone trap doc 198 rule 20 records for this same shell).
  //
  // Seeded by SPREAD, never by identity: `STUDIO_SAMPLE_DATA` is a shared module constant the studio canvas below
  // also renders, so handing the same object to a controlled `data` would let any future mutation leak one preview's
  // answers into the canvas and into the next document — the failure doc 200 records for `documentFor()`.
  const [previewData, setPreviewData] = useState<Record<string, unknown>>(() => ({
    ...STUDIO_SAMPLE_DATA,
  }));

  // Doc 184 rules 9-12: answers are kept WHILE previewing and discarded on LEAVING, so the next preview starts empty.
  // The reset therefore keys off the preview session, not `rootKey` — `rootKey` changes only when the document or the
  // focused Form does, so seeding on it alone would carry one preview's answers into the next. (Re-entering preview
  // is the only route back in, so this subsumes a per-document reset.)
  const [previewedAs, setPreviewedAs] = useState(previewing);
  if (previewedAs !== previewing) {
    setPreviewedAs(previewing);
    if (previewing) setPreviewData({ ...STUDIO_SAMPLE_DATA });
  }

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
    // Doc 202 rule 40b: a FLOW is previewed through the runner, so the author gets the citizen's real experience —
    // Back/Next, per-form gating, live branching, and a Submit that opens the payload dialog (rule 38) because no
    // handler is passed. The renderer entry alone could never offer those: the action bar is the runner's chrome and
    // sits outside the single `<JsonForms>` the entry is dispatched inside.
    //
    // Doc 202 rule 40c: a whole Form DOCUMENT gets the runner too — it is the entire form a citizen fills, so
    // previewing it must show the action bar, or previewing a basic form would tell the author LESS than previewing
    // a multi-stage one. The one case that falls through is a Form FOCUSED inside a Flow (doc 196 rule 16): that is
    // one step of a longer journey, and offering Submit there would misrepresent how a citizen reaches it.
    //
    // The document root is what separates them — a focused Form has a `Form` preview root under a `Flow` document.
    /**
     * Doc 211 rules 28-29: Readable shows the SAME preview root with the SAME answers, as a submission —
     * so an author fills the form in, flips the toggle, and sees exactly what a reviewer will read back.
     *
     * It takes ALL THREE preview cases, including the Form focused inside a Flow that falls through the
     * runner below: `SubmissionView` accepts a `Form` root as readily as a `Flow`, and there is no action
     * bar here to misrepresent (rule 22), which is the one thing rule 40c's fall-through exists to avoid.
     */
    const content =
      previewMode === 'readable' ? (
        <SubmissionView
          key={`readable-${rootKey}`}
          schema={schema}
          uischema={previewRoot}
          data={previewData}
        />
      ) : previewRoot.type === FLOW_TYPE || isPageRoot(uischema.type) ? (
        <FormRunner
          key={`preview-${rootKey}`}
          schema={schema}
          uischema={previewRoot}
          data={previewData}
          onChange={setPreviewData}
        />
      ) : (
        <JsonForms
          key={`preview-${rootKey}`}
          schema={schema}
          uischema={previewRoot}
          data={previewData}
          onChange={({ data }) => setPreviewData(data as Record<string, unknown>)}
          renderers={PREVIEW_RENDERERS}
          cells={defaultSet.cells}
        />
      );

    // Doc 202 rule 40d: ONE frame around whatever preview renders — the runner for a Flow or a whole Form document,
    // the plain render for a focused Form. Framing only the runner would leave the third case looking unlike the
    // other two, which is the asymmetry rule 40c exists to avoid.
    //
    // `h-full` + `overflow-hidden`, NOT a box that hugs its content: the runner is a flex column with the action bar
    // pinned to its bottom edge, so a frame that shrank to the content would unpin the bar and float it under the
    // fields. The centre panel owns the outer scroll (`overflow-auto p-4`); the form scrolls INSIDE this frame, which
    // is how a citizen's page behaves.
    //
    // Doc 184 rule 17: Tablet and Mobile cap the frame's width and centre it; the height stays full either way.
    return (
      <div data-slot="form-studio-preview-stage" className="flex h-full min-h-0 justify-center">
        <div
          data-slot="form-studio-preview-frame"
          data-viewport={viewport}
          className={`flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card ${VIEWPORT_WIDTH[viewport]}`}
        >
          {/* Doc 216 rules 31-32: the override wraps ALL THREE preview paths at once, which is the whole reason
              it is a context and not a `config` key — each of them builds its own config. `null` provides
              nothing to force, so every Tabs draws as authored. */}
          <TabsOverrideProvider value={tabs}>{content}</TabsOverrideProvider>
        </div>
      </div>
    );
  }
  return (
    <StudioSelectionProvider value={selection}>
      <GridEditorProvider value={editor}>
        <FlowEditorProvider value={flowEditor}>
          <TabsEditorProvider value={tabsEditor}>
            {/* Doc 223: every renderer that draws an editable value reaches the editor from here.
                Supplied ONCE at the canvas root rather than threaded through the renderer sets: the
                surfaces live in three directories and none of them may import `renderers/studio`. */}
            <InlineEditableProvider value={InlineValue}>
              <JsonForms
                key={`studio-${rootKey}`}
                schema={schema}
                uischema={canvasRoot}
                data={STUDIO_SAMPLE_DATA}
                renderers={STUDIO_RENDERERS}
                cells={studioSet.cells}
                validationMode="NoValidation"
              />
            </InlineEditableProvider>
          </TabsEditorProvider>
        </FlowEditorProvider>
      </GridEditorProvider>
    </StudioSelectionProvider>
  );
}

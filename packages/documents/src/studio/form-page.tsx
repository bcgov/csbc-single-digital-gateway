import { JsonForms } from '@jsonforms/react';
import { useEffect } from 'react';
import {
  cells,
  renderers,
  StudioEditorProvider,
  useStudioEditor,
  type ElementPatch,
} from '../renderers/studio/index';
import type { FormPage } from './canvas-graph';
import { FADE_IN, FADE_OUT } from './canvas-zoom';

/** The page draws no answers: one stable object, so JSONForms is never handed new data. */
const NO_DATA = {};

/**
 * A focused Form's page body (doc 233 rule 4): the Form itself, through the studio renderers — whose Form renderer
 * draws its title and elements (doc 236 rules 35, 39-44). While the node is growing or shrinking it is pinned to the frame and clipped by it, so it is revealed as
 * the node zooms open; once `open`, it lays out normally, its height is the page's, and — given `onEdit` — it is
 * editable.
 */
export function FormPageBody({
  label,
  page,
  open = false,
  closing = false,
  onEdit,
}: {
  label: string;
  page: FormPage | null;
  open?: boolean;
  /** Back: fading out over the card as the node shrinks, and hidden from assistive tech — the card is what's there. */
  closing?: boolean;
  /** Applies a renderer's edit; only an open page edits, so nothing drags while the node animates. */
  onEdit?: (id: string, patch: ElementPatch) => void;
}) {
  const layout = open && !closing ? 'relative' : 'absolute inset-0 overflow-hidden';
  return (
    <article
      aria-label={`${label} page`}
      aria-hidden={closing || undefined}
      className={`pointer-events-none flex flex-col gap-6 rounded-md bg-background p-12 ${layout} ${closing ? FADE_OUT : FADE_IN}`}
    >
      {page !== null && <PageContent page={page} onEdit={open && !closing ? onEdit : undefined} />}
    </article>
  );
}

/** The Form's elements as a studio VerticalLayout under the Form's own id, so a reorder writes back to the Form. */
function PageContent({
  page,
  onEdit,
}: {
  page: FormPage;
  onEdit: ((id: string, patch: ElementPatch) => void) | undefined;
}) {
  // The Form as authored: the Form renderers draw its title and lay out its elements (doc 236 rule 35).
  const form = (
    <JsonForms
      schema={page.schema}
      uischema={page.form as never}
      data={NO_DATA}
      renderers={renderers}
      cells={cells}
      validationMode="NoValidation"
    />
  );
  return onEdit === undefined ? (
    form
  ) : (
    <StudioEditorProvider update={onEdit}>
      <DeselectOnBackground />
      {form}
    </StudioEditorProvider>
  );
}

/**
 * Clears the studio selection on a click on the canvas background (doc 236 rule 35b): the pane, or the page's own
 * whitespace — anything in the page node that is not a studio element. Floating panels sit outside both, so using
 * them keeps the selection. A document listener, because the page is `pointer-events-none` and its whitespace clicks
 * land on the xyflow node, not on anything the renderers draw.
 */
function DeselectOnBackground() {
  const select = useStudioEditor()?.select;
  useEffect(() => {
    if (select === undefined) return;
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const target = event.target;
      const background =
        target.closest('.react-flow__pane') !== null ||
        (target.closest('.react-flow__node') !== null &&
          target.closest('[data-slot="studio-element"]') === null);
      if (background) select(null);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [select]);
  return null;
}

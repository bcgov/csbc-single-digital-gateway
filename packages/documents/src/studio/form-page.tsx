import type { Governance } from './capabilities/governance';
import type { GridDrop } from '../renderers/default/grid-placement';
import { JsonForms } from '@jsonforms/react';
import { useEffect, useMemo } from 'react';
import {
  cells,
  renderers,
  StudioEditorProvider,
  useStudioEditor,
  type ElementPatch,
} from '../renderers/studio/index';
import type { FormPage } from './canvas-graph';
import { FADE_IN, FADE_OUT_LATE } from './canvas-zoom';
import { stripRules } from './rules/strip-rules';

const NO_INSERT = () => {};
const NO_EDIT = () => {};

/** The page draws no answers: one stable object, so JSONForms is never handed new data. */
const NO_DATA = {};

/**
 * A focused Form's page body (doc 233 rule 4): the Form itself, through the studio renderers — whose Form renderer
 * draws its title and elements (doc 236 rules 35, 39-44). It is always pinned to the node's frame: clipped while the
 * node grows or shrinks, so it is revealed as the node zooms open; once `open`, it is the page's scroller (doc 241
 * rule 2) — `nowheel`, so xyflow leaves the wheel to it — and, given `onEdit`, editable. Back keeps this same element
 * (doc 241 rule 6), so its scroll position survives the shrink.
 */
export function FormPageBody({
  label,
  page,
  open = false,
  closing = false,
  onEdit,
  onInsert = NO_INSERT,
  onRemove,
  onMove,
  onCopy,
  onEditOptions,
  onEditRule,
  ruleProblems,
  canAddRule,
  governance,
  onSelectionChange,
}: {
  label: string;
  page: FormPage | null;
  open?: boolean;
  /** Back: fading out over the card once the node has shrunk, and hidden from assistive tech — the card is what's there. */
  closing?: boolean;
  /** Applies a renderer's edit; only an open page edits, so nothing drags while the node animates. */
  onEdit?: (id: string, patch: ElementPatch) => void;
  /** Places a palette item dropped on one of the page's grids (doc 238). */
  onInsert?: (layoutId: string, index: number, itemId: string, cell?: GridDrop) => void;
  /** Asks to delete a page element (doc 242); absent = elements offer no Delete. */
  onRemove?: ((id: string, name: string) => void) | undefined;
  /** Moves a page element into another layout (doc 243); only an open page edits, so only it moves. */
  onMove?: ((id: string, layoutId: string, index: number, cell?: GridDrop) => void) | undefined;
  /** Copies a page element, returning the copy's id (doc 254 rule 6); only an open page copies. */
  onCopy?: ((id: string) => string | undefined) | undefined;
  /** Opens the options editor for a choice field (doc 255 rule 3); only an open page edits. */
  onEditOptions?: ((id: string) => void) | undefined;
  /** Opens the rule dialog for a page element (doc 256 rule 9); only an open page edits. */
  onEditRule?: ((id: string) => void) | undefined;
  /** The fields a page element's rule may not test (doc 256 rule 5): the error state shows on any page. */
  ruleProblems?: ((id: string) => string[]) | undefined;
  /** Whether a page element has any field above it to test (doc 256 rule 9b); absent: always. */
  canAddRule?: ((id: string) => boolean) | undefined;
  /** The pinned template's rules (doc 259); absent: ungoverned. */
  governance?: Governance | undefined;
  /** Told when a page element is selected or deselected (doc 238 rule 16b). */
  onSelectionChange?: ((id: string | null) => void) | undefined;
}) {
  const scrolls = open && !closing;
  const layout = scrolls ? 'nowheel overflow-y-auto' : 'pointer-events-none overflow-hidden';
  return (
    <article
      aria-label={`${label} page`}
      aria-hidden={closing || undefined}
      className={`absolute inset-0 flex flex-col gap-6 rounded-md bg-background p-12 ${layout} ${closing ? FADE_OUT_LATE : FADE_IN}`}
    >
      {page !== null && (
        <PageContent
          page={page}
          onEdit={open && !closing ? onEdit : undefined}
          onInsert={onInsert}
          onRemove={onRemove}
          onMove={onMove}
          onCopy={open && !closing ? onCopy : undefined}
          onEditOptions={open && !closing ? onEditOptions : undefined}
          onEditRule={open && !closing ? onEditRule : undefined}
          ruleProblems={ruleProblems}
          canAddRule={canAddRule}
          governance={governance}
          onSelectionChange={onSelectionChange}
        />
      )}
    </article>
  );
}

/** The Form's elements as a studio VerticalLayout under the Form's own id, so a reorder writes back to the Form. */
function PageContent({
  page,
  onEdit,
  onInsert,
  onRemove,
  onMove,
  onCopy,
  onEditOptions,
  onEditRule,
  ruleProblems,
  canAddRule,
  governance,
  onSelectionChange,
}: {
  page: FormPage;
  onEdit: ((id: string, patch: ElementPatch) => void) | undefined;
  onInsert: (layoutId: string, index: number, itemId: string, cell?: GridDrop) => void;
  onRemove: ((id: string, name: string) => void) | undefined;
  onMove: ((id: string, layoutId: string, index: number, cell?: GridDrop) => void) | undefined;
  onCopy: ((id: string) => string | undefined) | undefined;
  onEditOptions: ((id: string) => void) | undefined;
  onEditRule: ((id: string) => void) | undefined;
  ruleProblems: ((id: string) => string[]) | undefined;
  canAddRule: ((id: string) => boolean) | undefined;
  governance: Governance | undefined;
  onSelectionChange: ((id: string | null) => void) | undefined;
}) {
  // The Form as authored: the Form renderers draw its title and lay out its elements (doc 236 rule 35).
  // The canvas ignores rules (doc 256 rule 7): with no answers, a rule would hide or disable the element being authored.
  const canvasForm = useMemo(() => stripRules(page.form), [page.form]);
  const form = (
    <JsonForms
      schema={page.schema}
      uischema={canvasForm as never}
      data={NO_DATA}
      renderers={renderers}
      cells={cells}
      validationMode="NoValidation"
    />
  );
  // Always the same tree, editable or not: swapping the provider in and out would remount the form, collapsing the
  // page's content for a frame and losing its scroll as Back starts (doc 241 rule 6).
  return (
    <StudioEditorProvider
      update={onEdit ?? NO_EDIT}
      insert={onInsert}
      remove={onRemove}
      move={onMove}
      copy={onCopy}
      editOptions={onEditOptions}
      editRule={onEditRule}
      ruleProblems={ruleProblems}
      canAddRule={canAddRule}
      governance={governance}
      onSelectionChange={onSelectionChange}
      enabled={onEdit !== undefined}
    >
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

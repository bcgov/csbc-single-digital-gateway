import type { ReactNode } from 'react';
import { isGridLayoutType, TABS_TYPE } from '../gridstack/grid-layouts';
import { useTabsEditor } from '../gridstack/tabs-editor';
import { useFlowEditor } from '../xyflow/flow-editor';
import { FLOW_TYPE, isFlowNodeType } from '../xyflow/flow-elements';

interface StudioContentProps {
  /**
   * The element's uischema type. A gridstack layout stays interactive so its own items can be dragged, and a Flow so
   * its canvas pans and zooms.
   */
  readonly type: string;
  readonly children: ReactNode;
}

/** The content's classes: locked content lets presses through; a Flow's canvas fills the frame (doc 195 rule 23). */
function contentClass(locked: boolean, flow: boolean): string | undefined {
  if (locked) return 'pointer-events-none';
  return flow ? 'h-full' : undefined;
}

/**
 * Holds a studio element's rendered content out of reach (doc 180 rule 17c).
 *
 * `inert` removes focus and interaction even when JSONForms keeps a control enabled —
 * `options.readonly` or an enable rule outrank the `enabled={false}` the studio passes down — and
 * `pointer-events-none` lets a press fall through to the grid item, whose content element is
 * gridstack's drag handle. A gridstack layout (`Grid`, `VerticalLayout`, `HorizontalLayout`) is exempt:
 * making it inert would freeze its own items. So is a Flow (doc 195 rule 23), whose canvas must pan and zoom; its
 * nodes stay locked. Under a Flow editor a Stage or Condition is locked but NOT inert (doc 196 rule 13, doc 199
 * rule 31): `inert` on an ancestor cannot be undone below it, and the cards' row controls opt back in to pointer
 * events. Doc 216 rule 35: a Tabs under a Tabs editor is the third case, for exactly that reason — its strip's
 * `+` and its triggers must stay clickable.
 */
export function StudioContent({ type, children }: StudioContentProps) {
  const flowEditing = useFlowEditor() !== null;
  const tabsEditing = useTabsEditor() !== null;
  const flow = type === FLOW_TYPE;
  /**
   * Doc 216 rule 35: a Tabs is NOT locked either, for exactly the reason a gridstack layout is exempt —
   * "making it inert would freeze its own items". A tab's panel IS a grid, and locking the Tabs put
   * `pointer-events-none` over the whole subtree: the fields inside a panel could not be selected and could
   * not be dragged in or out, and the strip's own controls only worked because they opt back in explicitly.
   *
   * The trade-off is the same one every gridstack layout already accepts: presses no longer fall through to
   * the grid item beneath, so a Tabs is dragged by its frame rather than by its body.
   */
  const tabs = tabsEditing && type === TABS_TYPE;
  const locked = !flow && !tabs && !isGridLayoutType(type);
  /**
   * Doc 199 rule 31: a Condition is locked-but-not-inert for the same reason a Stage is — its card's pickers
   * and row buttons must stay reachable, and `inert` on an ancestor cannot be undone below it.
   *
   * Doc 216 rule 35: and a Tabs, whose `+` and triggers are the only way to author or open a tab. A Tabs is
   * deliberately NOT a gridstack layout kind (rule 1) — its children are Tabs, not droppable items — so it does
   * not get the exemption `isGridLayoutType` grants, and without this clause its whole strip was inert. The
   * strip's controls already carry `pointer-events-auto`, which is useless under an inert ancestor. FOUND BY
   * HAND: the button worked from a script (`.click()` ignores inert) and could not be pressed with a mouse,
   * so nothing in jsdom would have caught it.
   */
  const inert = locked && !(flowEditing && isFlowNodeType(type));
  return (
    <div data-slot="studio-content" inert={inert} className={contentClass(locked, flow)}>
      {children}
    </div>
  );
}

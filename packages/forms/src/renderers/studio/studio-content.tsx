import type { ReactNode } from 'react';
import { isGridLayoutType } from '../gridstack/grid-layouts';
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
 * events.
 */
export function StudioContent({ type, children }: StudioContentProps) {
  const flowEditing = useFlowEditor() !== null;
  const flow = type === FLOW_TYPE;
  const locked = !flow && !isGridLayoutType(type);
  // Doc 199 rule 31: a Condition is locked-but-not-inert for the same reason a Stage is — its card's pickers
  // and row buttons must stay reachable, and `inert` on an ancestor cannot be undone below it.
  const inert = locked && !(flowEditing && isFlowNodeType(type));
  return (
    <div data-slot="studio-content" inert={inert} className={contentClass(locked, flow)}>
      {children}
    </div>
  );
}

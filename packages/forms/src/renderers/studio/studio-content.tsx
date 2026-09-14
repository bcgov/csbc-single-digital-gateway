import type { ReactNode } from 'react';
import { isGridLayoutType } from '../gridstack/grid-layouts';

interface StudioContentProps {
  /** The element's uischema type. A gridstack layout stays interactive so its own items can be dragged. */
  readonly type: string;
  readonly children: ReactNode;
}

/**
 * Holds a studio element's rendered content out of reach (doc 180 rule 17c).
 *
 * `inert` removes focus and interaction even when JSONForms keeps a control enabled —
 * `options.readonly` or an enable rule outrank the `enabled={false}` the studio passes down — and
 * `pointer-events-none` lets a press fall through to the grid item, whose content element is
 * gridstack's drag handle. A gridstack layout (`Grid`, `VerticalLayout`, `HorizontalLayout`) is exempt:
 * making it inert would freeze its own items.
 */
export function StudioContent({ type, children }: StudioContentProps) {
  const locked = !isGridLayoutType(type);
  return (
    <div
      data-slot="studio-content"
      inert={locked}
      className={locked ? 'pointer-events-none' : undefined}
    >
      {children}
    </div>
  );
}

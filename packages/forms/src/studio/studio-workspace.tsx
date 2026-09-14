import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@repo/ui/resizable';
import type { FC, ReactNode } from 'react';
import type { Layout } from 'react-resizable-panels';
import type { DockPanel, DockPanelId } from './dock-panels';

interface DockPanelViewProps {
  readonly dock: DockPanel;
  readonly children?: ReactNode;
}

/**
 * A collapsible dock panel. Its content is `inert` while closed so a 0%-wide panel keeps nothing in
 * the tab order or accessibility tree.
 */
const DockPanelView: FC<DockPanelViewProps> = ({ dock, children }) => (
  <ResizablePanel {...dock.panelProps}>
    <div
      id={dock.contentId}
      data-slot={`form-studio-${dock.id}-panel`}
      inert={!dock.open}
      className="h-full overflow-auto"
    >
      {children}
    </div>
  </ResizablePanel>
);

export interface StudioWorkspaceProps {
  readonly panels: Readonly<Record<DockPanelId, DockPanel>>;
  /** Centre canvas content. */
  readonly children?: ReactNode;
  /** Right dock panel content — the inspector (doc 187). */
  readonly right?: ReactNode;
}

/**
 * The resizable workspace (doc 181 rules 4-9): left / centre / right in a horizontal group, above a
 * bottom panel spanning the full width.
 *
 * A dock panel's separator is rendered only while that panel is open, and never with a grip — a closed
 * panel has no drag target, so it can be reopened only from its toggle.
 *
 * Each separator carries a 1px negative margin toward its dock panel, so it overlays that panel's edge
 * and takes no layout space: unmounting it on release shifts nothing, and while a drag holds the panel
 * at 0 the line sits just outside the group, which clips it (react-resizable-panels sets
 * `overflow: hidden`).
 */
export const StudioWorkspace: FC<StudioWorkspaceProps> = ({
  panels,
  right: rightContent,
  children,
}) => {
  const { left, right, bottom } = panels;
  const syncRow = (layout: Layout) => {
    left.syncLayout(layout);
    right.syncLayout(layout);
  };

  return (
    <ResizablePanelGroup orientation="vertical" onLayoutChanged={bottom.syncLayout}>
      <ResizablePanel minSize="20%">
        <ResizablePanelGroup orientation="horizontal" onLayoutChanged={syncRow}>
          <DockPanelView dock={left} />
          {left.open && <ResizableHandle className="-ml-px" />}
          <ResizablePanel minSize="20%">
            <div data-slot="form-studio-center-panel" className="h-full overflow-auto p-4">
              {children}
            </div>
          </ResizablePanel>
          {right.open && <ResizableHandle className="-mr-px" />}
          <DockPanelView dock={right}>{rightContent}</DockPanelView>
        </ResizablePanelGroup>
      </ResizablePanel>
      {bottom.open && <ResizableHandle className="-mb-px" />}
      <DockPanelView dock={bottom} />
    </ResizablePanelGroup>
  );
};

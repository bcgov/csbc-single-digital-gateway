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
}

/**
 * The resizable workspace (doc 181 rules 4-9): left / centre / right in a horizontal group, above a
 * bottom panel spanning the full width.
 *
 * A dock panel's separator is rendered only while that panel is open, and never with a grip — a closed
 * panel has no drag target, so it can be reopened only from its toggle.
 */
export const StudioWorkspace: FC<StudioWorkspaceProps> = ({ panels, children }) => {
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
          {left.open && <ResizableHandle />}
          <ResizablePanel minSize="20%">
            <div data-slot="form-studio-center-panel" className="h-full overflow-auto p-4">
              {children}
            </div>
          </ResizablePanel>
          {right.open && <ResizableHandle />}
          <DockPanelView dock={right} />
        </ResizablePanelGroup>
      </ResizablePanel>
      {bottom.open && <ResizableHandle />}
      <DockPanelView dock={bottom} />
    </ResizablePanelGroup>
  );
};

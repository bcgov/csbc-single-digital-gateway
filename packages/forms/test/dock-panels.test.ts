import { act, renderHook } from '@testing-library/react';
import type { PanelImperativeHandle } from 'react-resizable-panels';
import { describe, expect, it, vi } from 'vitest';
import { DOCK_PANEL_ORDER, DOCK_PANELS, useDockPanel } from '../src/studio/dock-panels';

/** jsdom cannot lay react-resizable-panels out (doc 181 known issue), so the handle is faked. */
function fakeHandle(): PanelImperativeHandle {
  return {
    collapse: vi.fn(),
    expand: vi.fn(),
    getSize: vi.fn(() => ({ asPercentage: 0, inPixels: 0 })),
    isCollapsed: vi.fn(() => false),
    resize: vi.fn(),
  };
}

function renderDock(id: 'left' | 'right' | 'bottom') {
  const hook = renderHook(() => useDockPanel(id));
  const handle = fakeHandle();
  hook.result.current.panelRef.current = handle;
  return { ...hook, handle };
}

describe('DOCK_PANELS', () => {
  it('configures left open at 20% snapping below 12%', () => {
    expect(DOCK_PANELS.left).toEqual({
      label: 'Left panel',
      defaultOpen: true,
      defaultSize: 20,
      minSize: 12,
    });
  });

  it('configures right closed at 20% snapping below 12%', () => {
    expect(DOCK_PANELS.right).toEqual({
      label: 'Right panel',
      defaultOpen: false,
      defaultSize: 20,
      minSize: 12,
    });
  });

  it('configures bottom closed at 25% snapping below 15%', () => {
    expect(DOCK_PANELS.bottom).toEqual({
      label: 'Bottom panel',
      defaultOpen: false,
      defaultSize: 25,
      minSize: 15,
    });
  });

  it('is frozen, and orders the triggers left, bottom, right', () => {
    expect(Object.isFrozen(DOCK_PANELS)).toBe(true);
    expect(Object.isFrozen(DOCK_PANELS.left)).toBe(true);
    expect(DOCK_PANEL_ORDER).toEqual(['left', 'bottom', 'right']);
  });
});

describe('useDockPanel', () => {
  describe('initial state (rules 6, 10)', () => {
    it('seeds open from defaultOpen', () => {
      expect(renderDock('left').result.current.open).toBe(true);
      expect(renderDock('right').result.current.open).toBe(false);
      expect(renderDock('bottom').result.current.open).toBe(false);
    });

    it('gives an open-by-default panel its default size as defaultSize', () => {
      const { result } = renderDock('left');
      expect(result.current.panelProps).toMatchObject({
        id: result.current.panelId,
        collapsible: true,
        collapsedSize: '0%',
        minSize: '12%',
        defaultSize: '20%',
      });
      expect(result.current.panelProps.panelRef).toBe(result.current.panelRef);
    });

    it('starts a closed-by-default panel collapsed at 0%', () => {
      expect(renderDock('right').result.current.panelProps).toMatchObject({
        collapsible: true,
        collapsedSize: '0%',
        minSize: '12%',
        defaultSize: '0%',
      });
      expect(renderDock('bottom').result.current.panelProps).toMatchObject({
        minSize: '15%',
        defaultSize: '0%',
      });
    });

    it('issues distinct panel and content ids per instance', () => {
      const a = renderDock('left').result.current;
      const b = renderDock('left').result.current;
      expect(a.panelId).not.toBe(b.panelId);
      expect(a.contentId).not.toBe(b.contentId);
      expect(a.panelId).not.toBe(a.contentId);
    });
  });

  describe('toggle (rules 11, 14)', () => {
    it('collapses an open panel and marks it closed', () => {
      const { result, handle } = renderDock('left');
      act(() => result.current.toggle());
      expect(result.current.open).toBe(false);
      expect(handle.collapse).toHaveBeenCalledTimes(1);
      expect(handle.resize).not.toHaveBeenCalled();
    });

    it('opens a closed panel by resizing to its default size, never via expand()', () => {
      const { result, handle } = renderDock('right');
      act(() => result.current.toggle());
      expect(result.current.open).toBe(true);
      expect(handle.resize).toHaveBeenCalledWith('20%');
      expect(handle.expand).not.toHaveBeenCalled();
      expect(handle.collapse).not.toHaveBeenCalled();
    });

    it('opens the bottom panel at 25%', () => {
      const { result, handle } = renderDock('bottom');
      act(() => result.current.toggle());
      expect(handle.resize).toHaveBeenCalledWith('25%');
    });

    it('still flips open without throwing before the panel handle exists', () => {
      const { result } = renderHook(() => useDockPanel('left'));
      expect(result.current.panelRef.current).toBeNull();
      act(() => result.current.toggle());
      expect(result.current.open).toBe(false);
      act(() => result.current.toggle());
      expect(result.current.open).toBe(true);
    });
  });

  // Doc 184 rule 13 — idempotent show()/hide(), used to enter and leave preview. Not open()/close():
  // `open` is already the panel's boolean state.
  describe('show / hide', () => {
    it('closes an open panel once and does nothing when it is already closed', () => {
      const { result, handle } = renderDock('left');
      act(() => result.current.hide());
      expect(result.current.open).toBe(false);
      act(() => result.current.hide());
      expect(result.current.open).toBe(false);
      expect(handle.collapse).toHaveBeenCalledTimes(1);
    });

    it('opens a closed panel at its remembered size once and does nothing when it is already open', () => {
      const { result, handle } = renderDock('right');
      act(() => result.current.show());
      expect(result.current.open).toBe(true);
      act(() => result.current.show());
      expect(result.current.open).toBe(true);
      expect(handle.resize).toHaveBeenCalledTimes(1);
      expect(handle.resize).toHaveBeenCalledWith('20%');
      expect(handle.expand).not.toHaveBeenCalled();
    });

    it('reopens a closed panel at the size it had before it was closed', () => {
      const { result, handle } = renderDock('left');
      act(() => result.current.syncLayout({ [result.current.panelId]: 28 }));
      act(() => result.current.hide());
      act(() => result.current.syncLayout({ [result.current.panelId]: 0 }));
      act(() => result.current.show());
      expect(handle.resize).toHaveBeenCalledWith('28%');
    });

    it('works before the panel handle exists', () => {
      const { result } = renderHook(() => useDockPanel('left'));
      act(() => result.current.hide());
      expect(result.current.open).toBe(false);
      act(() => result.current.show());
      expect(result.current.open).toBe(true);
    });
  });

  // Doc 184 rule 13b — react-resizable-panels resizes at panel boundaries even without a Separator, so
  // a closed dock panel is disabled or its edge can be dragged open. The panel handle's imperative
  // resize()/collapse() ignore `disabled`, so show() still reopens it.
  describe('disabled while closed', () => {
    it('disables a closed-by-default panel and enables an open-by-default one', () => {
      expect(renderDock('right').result.current.panelProps.disabled).toBe(true);
      expect(renderDock('bottom').result.current.panelProps.disabled).toBe(true);
      expect(renderDock('left').result.current.panelProps.disabled).toBe(false);
    });

    it('disables a panel when it is hidden and enables it again when it is shown', () => {
      const { result, handle } = renderDock('left');

      act(() => result.current.hide());
      expect(result.current.panelProps.disabled).toBe(true);

      act(() => result.current.show());
      expect(result.current.panelProps.disabled).toBe(false);
      expect(handle.resize).toHaveBeenCalledWith('20%');
    });

    it('follows open when a committed layout closes or opens the panel', () => {
      const { result } = renderDock('right');
      act(() => result.current.syncLayout({ [result.current.panelId]: 18 }));
      expect(result.current.panelProps.disabled).toBe(false);
      act(() => result.current.syncLayout({ [result.current.panelId]: 0 }));
      expect(result.current.panelProps.disabled).toBe(true);
    });
  });

  describe('syncLayout — committed group layouts (rules 12-13)', () => {
    it('reopens at the size last committed by the group layout', () => {
      const { result, handle } = renderDock('left');
      act(() => result.current.syncLayout({ [result.current.panelId]: 30 }));
      act(() => result.current.toggle());
      act(() => result.current.toggle());
      expect(handle.resize).toHaveBeenCalledWith('30%');
    });

    it('marks the panel closed when a layout commits it at 0, keeping the pre-drag size', () => {
      const { result, handle } = renderDock('left');
      act(() => result.current.syncLayout({ [result.current.panelId]: 32 }));
      expect(result.current.open).toBe(true);
      act(() => result.current.syncLayout({ [result.current.panelId]: 0 }));
      expect(result.current.open).toBe(false);
      act(() => result.current.toggle());
      expect(result.current.open).toBe(true);
      expect(handle.resize).toHaveBeenCalledWith('32%');
    });

    it('marks a closed panel open when a layout commits it at a non-zero size', () => {
      const { result } = renderDock('right');
      act(() => result.current.syncLayout({ [result.current.panelId]: 18 }));
      expect(result.current.open).toBe(true);
    });

    it('ignores layouts that do not mention this panel', () => {
      const { result, handle } = renderDock('right');
      act(() => result.current.syncLayout({ someOtherPanel: 45 }));
      expect(result.current.open).toBe(false);
      act(() => result.current.toggle());
      expect(handle.resize).toHaveBeenCalledWith('20%');
    });

    it('does not reconcile per resize, so a snap mid-drag never unmounts the dragged separator', () => {
      const { result } = renderDock('left');
      expect(result.current.panelProps).not.toHaveProperty('onResize');
      expect(result.current).not.toHaveProperty('onResize');
    });
  });
});

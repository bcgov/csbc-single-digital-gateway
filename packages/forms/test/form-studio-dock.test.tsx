import { mdiDockBottom, mdiDockLeft, mdiDockRight } from '@mdi/js';
import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderSeededStudio } from './render-studio';

const PANEL_SLOTS = ['left', 'center', 'right', 'bottom'] as const;

function renderStudio() {
  const { container } = renderSeededStudio();
  const q = (slot: string) => container.querySelector<HTMLElement>(`[data-slot="${slot}"]`);
  const content = q('form-studio-content');
  const vertical = content?.querySelector<HTMLElement>(
    ':scope > [data-slot="resizable-panel-group"]',
  );
  const horizontal = vertical?.querySelector<HTMLElement>('[data-slot="resizable-panel-group"]');
  const panels = Object.fromEntries(
    PANEL_SLOTS.map((name) => [name, q(`form-studio-${name}-panel`)]),
  ) as Record<(typeof PANEL_SLOTS)[number], HTMLElement | null>;
  return {
    container,
    header: q('form-studio-header'),
    footer: q('form-studio-footer'),
    content,
    vertical,
    horizontal,
    panels,
  };
}

/**
 * A group's direct children, named by the studio panel they hold or `handle` for a separator.
 * A Panel renders `div[data-panel] > div > children`, so only its OWN content wrapper is looked at —
 * the top panel, which holds a nested group, is `other`.
 */
function childSlots(group: HTMLElement | null | undefined): string[] {
  return Array.from(group?.children ?? []).map((child) => {
    if (child.getAttribute('data-slot') === 'resizable-handle') return 'handle';
    const inner = child.querySelector(
      ':scope > * > [data-slot^="form-studio-"][data-slot$="-panel"]',
    );
    return inner?.getAttribute('data-slot')?.replace(/^form-studio-|-panel$/g, '') ?? 'other';
  });
}

const trigger = (name: string) => screen.getByRole('button', { name });

/** The react-resizable-panels `[data-panel]` element around a studio panel's content wrapper. */
const panelElement = (content: HTMLElement | null) => content?.closest('[data-panel]');

describe('FormStudio dock panels (doc 181)', () => {
  describe('shell borders (rules 1-2)', () => {
    it('gives the header a bottom border and right-aligns its contents', () => {
      const { header } = renderStudio();
      expect(header).toHaveClass(
        'h-9',
        'shrink-0',
        'grow-0',
        'border-b',
        'flex',
        'items-center',
        'justify-end',
      );
      expect(header).not.toHaveClass('border-t');
    });

    it('gives the footer a top border', () => {
      const { footer } = renderStudio();
      expect(footer).toHaveClass('h-9', 'shrink-0', 'grow-0', 'border-t');
      expect(footer).not.toHaveClass('border-b');
    });
  });

  describe('toggles (rules 15-17)', () => {
    // Doc 184 rule 4 supersedes rule 15's "last child": the Preview toggle now follows the group.
    it('renders a joined horizontal toggle group directly before the preview control', () => {
      const { header } = renderStudio();
      const group = header?.lastElementChild?.previousElementSibling;
      // Doc 184 rule 19: the preview control is the header's last child — a button, with its menu when the
      // document is multi-stage (rule 20).
      expect(header?.lastElementChild).toHaveAttribute('data-slot', 'preview-control');
      expect(group).toHaveAttribute('data-slot', 'toggle-group');
      expect(group).toHaveAttribute('role', 'group');
      expect(group).toHaveAttribute('aria-label', 'Panels');
      expect(group).toHaveAttribute('data-orientation', 'horizontal');
      expect(group).toHaveAttribute('data-variant', 'outline');
      expect(group).toHaveAttribute('data-spacing', '0');
      expect(group).toHaveAttribute('data-size', 'sm');
    });

    it('orders the triggers Left, Bottom, Right', () => {
      renderStudio();
      const group = screen.getByRole('group', { name: 'Panels' });
      const buttons = within(group).getAllByRole('button');
      expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
        'Left panel',
        'Bottom panel',
        'Right panel',
      ]);
    });

    it('draws each trigger with its mdiDock icon', () => {
      renderStudio();
      const pathOf = (name: string) => trigger(name).querySelector('svg path')?.getAttribute('d');
      expect(pathOf('Left panel')).toBe(mdiDockLeft);
      expect(pathOf('Bottom panel')).toBe(mdiDockBottom);
      expect(pathOf('Right panel')).toBe(mdiDockRight);
    });

    it('reflects the default open state: left pressed, bottom and right not', () => {
      renderStudio();
      expect(trigger('Left panel')).toHaveAttribute('aria-pressed', 'true');
      expect(trigger('Bottom panel')).toHaveAttribute('aria-pressed', 'false');
      expect(trigger('Right panel')).toHaveAttribute('aria-pressed', 'false');
    });

    it('points each trigger at the panel content it controls', () => {
      const { panels } = renderStudio();
      expect(trigger('Left panel')).toHaveAttribute('aria-controls', panels.left?.id);
      expect(trigger('Bottom panel')).toHaveAttribute('aria-controls', panels.bottom?.id);
      expect(trigger('Right panel')).toHaveAttribute('aria-controls', panels.right?.id);
      expect(panels.left?.id).toBeTruthy();
    });

    it('styles icons grey (gray-70) when off and black when on', () => {
      renderStudio();
      for (const name of ['Left panel', 'Bottom panel', 'Right panel']) {
        expect(trigger(name)).toHaveAttribute('data-slot', 'toggle-group-item');
        expect(trigger(name)).toHaveClass('text-gray-70', 'aria-pressed:text-foreground');
        expect(trigger(name).className).not.toMatch(/bcgov-gold|bg-primary|text-muted-foreground/);
      }
    });

    it('sizes each toggle as a 24px square with no horizontal padding', () => {
      renderStudio();
      for (const name of ['Left panel', 'Bottom panel', 'Right panel']) {
        expect(trigger(name)).toHaveClass(
          'size-6',
          'min-w-6',
          'px-0',
          'group-data-[spacing=0]/toggle-group:px-0',
        );
        expect(trigger(name)).not.toHaveClass('px-2', 'group-data-[spacing=0]/toggle-group:px-2');
      }
    });

    it('marks only the open panel toggle as pressed for styling', () => {
      renderStudio();
      expect(trigger('Left panel')).toHaveAttribute('data-pressed');
      expect(trigger('Bottom panel')).not.toHaveAttribute('data-pressed');
      expect(trigger('Right panel')).not.toHaveAttribute('data-pressed');
    });
  });

  describe('workspace layout (rules 3-5)', () => {
    it('nests left/centre/right in a horizontal group above a full-width bottom panel', () => {
      const { vertical, horizontal, panels } = renderStudio();
      // react-resizable-panels sets a Group's direction as an inline style (aria-orientation is on
      // Separators only).
      expect(vertical).toHaveStyle({ flexDirection: 'column' });
      expect(horizontal).toHaveStyle({ flexDirection: 'row' });
      // bottom is a sibling of the whole left/centre/right row, not inside it
      expect(horizontal).not.toContainElement(panels.bottom);
      expect(vertical).toContainElement(panels.bottom);
      for (const name of ['left', 'center', 'right'] as const) {
        expect(horizontal).toContainElement(panels[name]);
      }
    });

    it('gives every panel a full-height scrolling content wrapper', () => {
      const { panels } = renderStudio();
      for (const name of PANEL_SLOTS) {
        expect(panels[name]).toHaveClass('h-full', 'overflow-auto');
      }
    });

    it('renders the doc-180 sample in the padded centre panel', async () => {
      const { panels, content } = renderStudio();
      const heading = await screen.findByRole('heading', { level: 1, name: 'Hello, FormStudio!' });
      expect(panels.center).toContainElement(heading);
      expect(panels.center).toHaveClass('p-4');
      expect(content).not.toHaveClass('overflow-auto');
      expect(content).not.toHaveClass('p-4');
    });
  });

  describe('separators and closed panels (rules 8-9)', () => {
    it('renders separators only beside open dock panels', () => {
      const { vertical, horizontal } = renderStudio();
      expect(childSlots(horizontal)).toEqual(['left', 'handle', 'center', 'right']);
      expect(childSlots(vertical)).toEqual(['other', 'bottom']);
    });

    it('offsets each separator 1px over its dock panel so it takes no layout space', () => {
      const { vertical, horizontal } = renderStudio();
      fireEvent.click(trigger('Right panel'));
      fireEvent.click(trigger('Bottom panel'));
      const rowHandles = horizontal?.querySelectorAll(':scope > [data-slot="resizable-handle"]');
      const bottomHandle = vertical?.querySelector(':scope > [data-slot="resizable-handle"]');
      expect(rowHandles).toHaveLength(2);
      expect(rowHandles?.[0]).toHaveClass('-ml-px');
      expect(rowHandles?.[1]).toHaveClass('-mr-px');
      expect(bottomHandle).toHaveClass('-mb-px');
    });

    it('never renders a grip inside a separator', () => {
      const { container } = renderStudio();
      const handles = container.querySelectorAll('[data-slot="resizable-handle"]');
      expect(handles.length).toBeGreaterThan(0);
      for (const handle of handles) expect(handle.children).toHaveLength(0);
    });

    it('makes closed panel content inert and open panel content interactive', () => {
      const { panels } = renderStudio();
      expect(panels.left).not.toHaveAttribute('inert');
      expect(panels.center).not.toHaveAttribute('inert');
      expect(panels.right).toHaveAttribute('inert');
      expect(panels.bottom).toHaveAttribute('inert');
    });

    // Doc 184 rule 13b — rrp builds drag hit regions from panel boundaries, skipping only panels that
    // carry data-disabled, so a closed panel must be disabled or its edge drags it open.
    it('marks closed dock panels data-disabled so their edges cannot be dragged open', () => {
      const { panels } = renderStudio();

      expect(panelElement(panels.left)).not.toHaveAttribute('data-disabled');
      expect(panelElement(panels.center)).not.toHaveAttribute('data-disabled');
      expect(panelElement(panels.right)).toHaveAttribute('data-disabled');
      expect(panelElement(panels.bottom)).toHaveAttribute('data-disabled');

      fireEvent.click(trigger('Left panel'));
      fireEvent.click(trigger('Right panel'));

      expect(panelElement(panels.left)).toHaveAttribute('data-disabled');
      expect(panelElement(panels.right)).not.toHaveAttribute('data-disabled');
    });
  });

  describe('toggling (rules 8-11)', () => {
    it('opening the right panel presses its trigger, adds its separator and un-inerts it', () => {
      const { horizontal, panels } = renderStudio();
      fireEvent.click(trigger('Right panel'));
      expect(trigger('Right panel')).toHaveAttribute('aria-pressed', 'true');
      expect(childSlots(horizontal)).toEqual(['left', 'handle', 'center', 'handle', 'right']);
      expect(panels.right).not.toHaveAttribute('inert');
    });

    it('opening the bottom panel adds the separator above it', () => {
      const { vertical, panels } = renderStudio();
      fireEvent.click(trigger('Bottom panel'));
      expect(trigger('Bottom panel')).toHaveAttribute('aria-pressed', 'true');
      expect(childSlots(vertical)).toEqual(['other', 'handle', 'bottom']);
      expect(panels.bottom).not.toHaveAttribute('inert');
    });

    it('closing the left panel un-presses its trigger, removes its separator and inerts it', () => {
      const { horizontal, panels } = renderStudio();
      fireEvent.click(trigger('Left panel'));
      expect(trigger('Left panel')).toHaveAttribute('aria-pressed', 'false');
      expect(childSlots(horizontal)).toEqual(['left', 'center', 'right']);
      expect(panels.left).toHaveAttribute('inert');
    });

    it('toggles back to the original state on a second click', () => {
      const { horizontal } = renderStudio();
      fireEvent.click(trigger('Left panel'));
      fireEvent.click(trigger('Left panel'));
      expect(trigger('Left panel')).toHaveAttribute('aria-pressed', 'true');
      expect(childSlots(horizontal)).toEqual(['left', 'handle', 'center', 'right']);
    });
  });
});

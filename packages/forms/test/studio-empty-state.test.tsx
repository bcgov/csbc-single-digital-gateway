import { render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FormStudio } from '../src/studio';
import type { DockPanel, DockPanelId } from '../src/studio/dock-panels';
import { useEmptyPanels } from '../src/studio/document/use-empty-panels';
import type { StudioDocument } from '../src/types/index';

// Doc 200 rules 15-21 — what occupies the centre while the session is not ready, and the dock panels
// that go with it.

/** Never settles: the studio stays in `loading`. Hoisted — an inline arrow would be a new identity per render. */
const NEVER: () => Promise<StudioDocument> = () => new Promise<StudioDocument>(() => undefined);

/** Always rejects. Hoisted for the same stable-identity reason as `NEVER` (doc 200 rule 4b). */
const REJECTS: () => Promise<StudioDocument> = () =>
  Promise.reject(new Error('form 42 could not be read'));

const centre = () => document.querySelector('[data-slot="form-studio-center-panel"]');
const toggles = () => screen.queryByRole('group', { name: 'Panels' });

/**
 * A stand-in dock panel: `useEmptyPanels` reads only `open` and calls `show`/`hide`, so the precedence rules can be
 * driven exactly, which the shell cannot do (a session never returns from `ready`, and preview needs a document).
 */
const panel = (open: boolean) => ({ open, show: vi.fn(), hide: vi.fn() });

const panelsOf = (left: boolean, right: boolean, bottom: boolean) => {
  const panels = { left: panel(left), right: panel(right), bottom: panel(bottom) };
  return {
    panels,
    record: panels as unknown as Readonly<Record<DockPanelId, DockPanel>>,
  };
};

describe('studio empty, loading and failed states', () => {
  describe('the empty state (rules 15-16)', () => {
    it('renders in the centre panel while the session is choosing', () => {
      render(<FormStudio />);

      const empty = document.querySelector('[data-slot="form-studio-empty"]');
      expect(empty).toBeInTheDocument();
      expect(centre()).toContainElement(empty as HTMLElement);
      expect(screen.getByText('No form open')).toBeInTheDocument();
    });

    it('renders no JSONForms document', () => {
      render(<FormStudio />);

      // Rule 23: the built-in sample is no longer the default, so nothing of it may be on screen.
      expect(screen.queryByText('Hello, FormStudio!')).toBeNull();
      expect(centre()?.querySelector('[data-slot="studio-element"]')).toBeNull();
    });

    it('offers a call to action that reopens the dialog', async () => {
      const user = userEvent.setup();
      render(<FormStudio />);

      // The dialog opens with the studio; dismiss it to get back to the bare empty state.
      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

      await user.click(screen.getByRole('button', { name: 'New form' }));

      expect(await screen.findByRole('dialog', { name: 'New form' })).toBeInTheDocument();
    });

    it('puts the call to action inside the Empty content region', async () => {
      const user = userEvent.setup();
      render(<FormStudio />);
      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

      // `EmptyContent` is the component's intended home for the action (rule 16).
      const content = document.querySelector('[data-slot="empty-content"]');
      expect(content).toBeInTheDocument();
      expect(
        within(content as HTMLElement).getByRole('button', { name: 'New form' }),
      ).toBeVisible();
    });
  });

  describe('the loading state (rule 17)', () => {
    it('renders while the session is loading', () => {
      render(<FormStudio loadDocument={NEVER} />);

      expect(document.querySelector('[data-slot="form-studio-loading"]')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.queryByText('No form open')).toBeNull();
    });

    it('exposes an accessible busy status', () => {
      render(<FormStudio loadDocument={NEVER} />);

      expect(document.querySelector('[data-slot="form-studio-loading"]')).toHaveAttribute(
        'aria-busy',
        'true',
      );
      expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    });

    it('gives way to the document once loading resolves', async () => {
      const loaded: StudioDocument = {
        schema: { type: 'object', properties: { a: { type: 'string', title: 'Applicant' } } },
        uischema: {
          type: 'Form',
          elements: [{ type: 'Control', scope: '#/properties/a' }],
        } as StudioDocument['uischema'],
      };
      const load = () => Promise.resolve(loaded);
      render(<FormStudio loadDocument={load} />);

      expect(document.querySelector('[data-slot="form-studio-loading"]')).toBeInTheDocument();

      expect(await screen.findByText('Applicant')).toBeInTheDocument();
      expect(document.querySelector('[data-slot="form-studio-loading"]')).toBeNull();
    });
  });

  describe('the failed state (rule 5)', () => {
    it('renders the failure with its reason as text', async () => {
      render(<FormStudio loadDocument={REJECTS} />);

      expect(await screen.findByText('form 42 could not be read')).toBeInTheDocument();
      expect(document.querySelector('[data-slot="form-studio-failed"]')).toBeInTheDocument();
    });

    it('offers a retry', async () => {
      const user = userEvent.setup();
      const loaded: StudioDocument = {
        schema: { type: 'object', properties: { b: { type: 'string', title: 'Second try' } } },
        uischema: {
          type: 'Form',
          elements: [{ type: 'Control', scope: '#/properties/b' }],
        } as StudioDocument['uischema'],
      };
      const load = vi
        .fn<() => Promise<StudioDocument>>()
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValueOnce(loaded);
      render(<FormStudio loadDocument={load} />);

      await user.click(await screen.findByRole('button', { name: 'Try again' }));

      expect(await screen.findByText('Second try')).toBeInTheDocument();
      expect(load).toHaveBeenCalledTimes(2);
    });
  });

  describe('dock panels while not ready (rules 18-21)', () => {
    it('shows no dock toggles while the session is choosing', () => {
      render(<FormStudio />);

      expect(toggles()).toBeNull();
      expect(screen.queryByRole('button', { name: 'Left panel' })).toBeNull();
    });

    it('shows no dock toggles while the session is loading', () => {
      render(<FormStudio loadDocument={NEVER} />);

      expect(toggles()).toBeNull();
    });

    it('closes a panel that was open when the session leaves ready', () => {
      const { panels, record } = panelsOf(true, false, true);
      const { rerender } = renderHook(({ ready }) => useEmptyPanels(record, ready), {
        initialProps: { ready: true },
      });
      expect(panels.left.hide).not.toHaveBeenCalled();

      rerender({ ready: false });

      expect(panels.left.hide).toHaveBeenCalledTimes(1);
      expect(panels.bottom.hide).toHaveBeenCalledTimes(1);
      expect(panels.right.hide).not.toHaveBeenCalled();
    });

    it('restores the panels it closed once the session is ready', () => {
      const { panels, record } = panelsOf(true, false, true);
      const { rerender } = renderHook(({ ready }) => useEmptyPanels(record, ready), {
        initialProps: { ready: false },
      });

      rerender({ ready: true });

      expect(panels.left.show).toHaveBeenCalledTimes(1);
      expect(panels.bottom.show).toHaveBeenCalledTimes(1);
    });

    it('leaves a panel the author had already closed closed', () => {
      // Rule 19: each actor restores only what it hid.
      const { panels, record } = panelsOf(true, false, false);
      const { rerender } = renderHook(({ ready }) => useEmptyPanels(record, ready), {
        initialProps: { ready: false },
      });

      rerender({ ready: true });

      expect(panels.left.show).toHaveBeenCalledTimes(1);
      expect(panels.right.show).not.toHaveBeenCalled();
      expect(panels.bottom.show).not.toHaveBeenCalled();
    });

    it('does not restore a panel preview is still hiding', () => {
      // Rule 19: session > preview > flow canvas. A panel preview already closed is not in this
      // hook's remembered set, so returning to ready must not reopen it behind preview's back.
      const { panels, record } = panelsOf(true, false, false);
      const { rerender } = renderHook(({ ready }) => useEmptyPanels(record, ready), {
        initialProps: { ready: false },
      });

      rerender({ ready: true });

      expect(panels.right.show).not.toHaveBeenCalled();
    });

    it('renders the whole shell without throwing when the session is not ready', () => {
      // Rule 20: doc 198's TDZ trap throws on every render of the shell, not just this path.
      expect(() => render(<FormStudio />)).not.toThrow();
      expect(document.querySelector('[data-slot="form-studio"]')).toBeInTheDocument();
      expect(document.querySelector('[data-slot="form-studio-footer"]')).toBeInTheDocument();
    });
  });
});

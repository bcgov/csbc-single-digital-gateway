import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { documentFor } from '../src/studio/document/document-source';
import { NewFormDialog } from '../src/studio/document/new-form-dialog';
import type { FormChoice, StudioDocument } from '../src/types/index';

// Doc 200 rules 7-11 — the New form dialog: a closeable @repo/ui Dialog holding a RadioGroup of four
// choice cards, confirmed by an explicit action.

const LABELS = [
  'New Multi-Stage Form',
  'New Basic Form',
  'Multi-Stage Template',
  'Basic Form Template',
];

/** A stand-in for the session (rule 2): it stays `choosing` until a choice is confirmed. */
function Harness({ onChoose }: { onChoose?: (choice: FormChoice) => void }) {
  const [open, setOpen] = useState(true);
  const [document, setDocument] = useState<StudioDocument | null>(null);

  return (
    <>
      <NewFormDialog
        open={open}
        onOpenChange={setOpen}
        onChoose={(choice) => {
          onChoose?.(choice);
          setDocument(documentFor(choice));
          setOpen(false);
        }}
      />
      <div data-testid="status">{document === null ? 'choosing' : 'ready'}</div>
      <div data-testid="root-type">
        {document === null ? 'none' : (document.uischema as { type: string }).type}
      </div>
    </>
  );
}

const radios = () => screen.getAllByRole('radio');
const radio = (name: string) => screen.getByRole('radio', { name });
const createButton = () => screen.getByRole('button', { name: 'Create' });

describe('NewFormDialog', () => {
  describe('the dialog (rule 7)', () => {
    it('is open while the session is choosing', () => {
      const { rerender } = render(
        <NewFormDialog open={false} onOpenChange={vi.fn()} onChoose={vi.fn()} />,
      );
      expect(screen.queryByRole('dialog')).toBeNull();

      rerender(<NewFormDialog open onOpenChange={vi.fn()} onChoose={vi.fn()} />);
      expect(screen.getByRole('dialog', { name: 'New form' })).toBeInTheDocument();
    });

    it('closes on Escape', async () => {
      // Rule 7: closeable — which is why this is Dialog, not the undismissible AlertDialog.
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<NewFormDialog open onOpenChange={onOpenChange} onChoose={vi.fn()} />);

      await user.keyboard('{Escape}');

      expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
    });

    it('closes from its close button', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<NewFormDialog open onOpenChange={onOpenChange} onChoose={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: 'Close' }));

      expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
    });

    it('leaves the studio in choosing when dismissed without a choice', async () => {
      const user = userEvent.setup();
      const onChoose = vi.fn();
      render(<Harness onChoose={onChoose} />);

      await user.keyboard('{Escape}');

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(onChoose).not.toHaveBeenCalled();
      expect(screen.getByTestId('status')).toHaveTextContent('choosing');
      expect(screen.getByTestId('root-type')).toHaveTextContent('none');
    });
  });

  describe('the four choices (rule 8)', () => {
    it('offers New Multi-Stage Form, New Basic Form, Multi-Stage Template and Basic Form Template in order', () => {
      render(<NewFormDialog open onOpenChange={vi.fn()} onChoose={vi.fn()} />);

      const order = radios();
      expect(order).toHaveLength(4);
      // Document order, not just presence: rule 8 fixes the order the dialog offers them in.
      for (const [index, label] of LABELS.entries()) {
        expect(order[index]).toBe(radio(label));
      }
    });

    it('renders them as one radio group', () => {
      render(<NewFormDialog open onOpenChange={vi.fn()} onChoose={vi.fn()} />);

      const groups = screen.getAllByRole('radiogroup');
      expect(groups).toHaveLength(1);
      expect(within(groups[0] as HTMLElement).getAllByRole('radio')).toHaveLength(4);
    });

    it('gives each choice a description', () => {
      render(<NewFormDialog open onOpenChange={vi.fn()} onChoose={vi.fn()} />);

      const descriptions = LABELS.map((label) => radio(label).getAttribute('aria-describedby'));
      expect(new Set(descriptions).size).toBe(4);
      for (const label of LABELS) {
        expect(radio(label)).toHaveAccessibleDescription(/\S/);
      }
    });
  });

  describe('the choice cards (rule 10)', () => {
    it('selects a choice when its card is clicked', async () => {
      // Base UI puts the id on the hidden input, so the label names the radio (doc 188).
      const user = userEvent.setup();
      render(<NewFormDialog open onOpenChange={vi.fn()} onChoose={vi.fn()} />);

      const card = radio('Basic Form Template').closest('label');
      expect(card).not.toBeNull();
      // Anywhere on the card, not the radio itself: the whole card is the label.
      await user.click(within(card as HTMLElement).getByText('Basic Form Template'));

      expect(radio('Basic Form Template')).toHaveAttribute('aria-checked', 'true');
    });

    it('moves the selection with the arrow keys', async () => {
      const user = userEvent.setup();
      render(<NewFormDialog open onOpenChange={vi.fn()} onChoose={vi.fn()} />);

      await user.click(radio('New Multi-Stage Form'));
      await user.keyboard('{ArrowDown}');

      expect(radio('New Basic Form')).toHaveAttribute('aria-checked', 'true');
      expect(radio('New Multi-Stage Form')).toHaveAttribute('aria-checked', 'false');
    });

    it('marks only the selected card checked', async () => {
      const user = userEvent.setup();
      render(<NewFormDialog open onOpenChange={vi.fn()} onChoose={vi.fn()} />);

      await user.click(radio('Multi-Stage Template'));

      expect(radios().map((element) => element.getAttribute('aria-checked'))).toEqual([
        'false',
        'false',
        'true',
        'false',
      ]);
    });
  });

  describe('confirming (rule 11)', () => {
    it('does not create a document on selection alone', async () => {
      const user = userEvent.setup();
      const onChoose = vi.fn();
      render(<Harness onChoose={onChoose} />);

      await user.click(radio('New Basic Form'));

      expect(onChoose).not.toHaveBeenCalled();
      expect(screen.getByTestId('status')).toHaveTextContent('choosing');
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('creates the selected document from the Create action', async () => {
      const user = userEvent.setup();
      render(<Harness />);

      await user.click(radio('New Basic Form'));
      await user.click(createButton());

      expect(screen.getByTestId('root-type')).toHaveTextContent('Form');
    });

    it('reports the chosen key to its caller', async () => {
      const user = userEvent.setup();
      const onChoose = vi.fn();
      render(<NewFormDialog open onOpenChange={vi.fn()} onChoose={onChoose} />);

      await user.click(radio('Multi-Stage Template'));
      await user.click(createButton());

      expect(onChoose).toHaveBeenCalledTimes(1);
      expect(onChoose).toHaveBeenCalledWith('template-multi-stage');
    });

    it('opens the studio on the chosen document and closes the dialog', async () => {
      const user = userEvent.setup();
      render(<Harness />);

      await user.click(radio('Multi-Stage Template'));
      await user.click(createButton());

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(screen.getByTestId('status')).toHaveTextContent('ready');
      expect(screen.getByTestId('root-type')).toHaveTextContent('Flow');
    });
  });
});

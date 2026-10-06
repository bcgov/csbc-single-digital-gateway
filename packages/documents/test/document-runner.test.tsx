import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DocumentRunner, ROOT_MESSAGE, type AnswersHandler } from '../src/runner';
import { control, edge, form, funnel } from './funnel-fixtures';

const SCHEMA = {
  type: 'object',
  required: ['name'],
  properties: { name: { type: 'string', title: 'Name' }, note: { type: 'string', title: 'Note' } },
};

const FORM = form('a', 'Applicant', [control('name')]);
const FUNNEL = funnel([FORM, form('b', 'Notes', [control('note')])], [edge('e1', 'a', 'b')]);

function Harness({
  uischema,
  onSubmit,
  onSaveDraft,
}: {
  uischema: Record<string, unknown>;
  onSubmit?: AnswersHandler;
  onSaveDraft?: AnswersHandler;
}) {
  const [data, setData] = useState<unknown>({});
  return (
    <DocumentRunner
      schema={SCHEMA}
      uischema={uischema}
      data={data}
      onChange={setData}
      {...(onSubmit !== undefined && { onSubmit })}
      {...(onSaveDraft !== undefined && { onSaveDraft })}
    />
  );
}

const button = (name: string) => screen.getByRole('button', { name });
const typeName = async (user: ReturnType<typeof userEvent.setup>) =>
  user.type(screen.getByRole('textbox', { name: /^Name/ }), 'Ada');

describe('DocumentRunner (doc 274 rules 35-39)', () => {
  describe('a Form root (rule 36)', () => {
    it('draws the page and an action bar with Save draft and Submit, but no Back and no rail', () => {
      render(<Harness uischema={FORM} />);
      expect(screen.getByRole('textbox', { name: /^Name/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
      expect(screen.queryByRole('navigation', { name: 'Steps' })).toBeNull();
      expect(button('Save draft')).toBeDisabled();
      expect(button('Submit')).toBeInTheDocument();
    });

    it('refuses Submit while the Form has an error, then shows the payload without a handler', async () => {
      const user = userEvent.setup();
      render(<Harness uischema={FORM} />);
      await waitFor(() => expect(button('Submit')).toBeDisabled());
      await typeName(user);
      await waitFor(() => expect(button('Submit')).toBeEnabled());
      await user.click(button('Submit'));
      const dialog = await screen.findByRole('dialog', { name: 'Submission preview' });
      expect(within(dialog).getByText(/"name": "Ada"/)).toBeInTheDocument();
    });

    it("calls the host's handlers with the answers (rule 37)", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const onSaveDraft = vi.fn();
      render(<Harness uischema={FORM} onSubmit={onSubmit} onSaveDraft={onSaveDraft} />);
      await typeName(user);
      // The text control's change is debounced: wait for it to reach the answers.
      await waitFor(() => expect(button('Submit')).toBeEnabled());
      await user.click(button('Save draft'));
      await waitFor(() => expect(onSaveDraft).toHaveBeenCalledWith({ name: 'Ada' }));
      await user.click(button('Submit'));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: 'Ada' }));
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  describe('a Funnel root (rule 35)', () => {
    it('draws the Funnel renderer, whose final Submit and Save draft go to the host', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const onSaveDraft = vi.fn();
      const off = {
        ...FUNNEL,
        options: { ...(FUNNEL['options'] as object), showSummaryPage: false },
      };
      render(<Harness uischema={off} onSubmit={onSubmit} onSaveDraft={onSaveDraft} />);
      expect(screen.getByRole('navigation', { name: 'Steps' })).toBeInTheDocument();
      // ONE action bar — the Funnel renderer's.
      expect(document.querySelectorAll('[data-slot="runner-actions"]')).toHaveLength(1);
      await typeName(user);
      await waitFor(() => expect(button('Next')).toBeEnabled());
      await user.click(button('Save draft'));
      await waitFor(() => expect(onSaveDraft).toHaveBeenCalledWith({ name: 'Ada' }));
      await user.click(button('Next'));
      await user.click(button('Submit'));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: 'Ada' }));
    });
  });

  it('says so for a root that is neither a Form nor a Funnel (rule 39)', () => {
    render(<Harness uischema={{ type: 'VerticalLayout', elements: [] }} />);
    expect(screen.getByRole('alert')).toHaveTextContent(ROOT_MESSAGE);
  });
});

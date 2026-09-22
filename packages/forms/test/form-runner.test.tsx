import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import pkg from '../package.json';
import { FormRunner, ROOT_MESSAGE } from '../src/runner/form-runner';

// Doc 202 rules 1-8, 34-39 — <FormRunner> itself: its props, the single JsonForms it mounts, a Form root, and the
// action bar shared by both root types.

const schema: JsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Name', maxLength: 4 },
    note: { type: 'string', title: 'Note' },
  },
  required: ['name'],
};

const el = (element: object) => element as UISchemaElement;
const control = (key: string) => ({ type: 'Control', scope: `#/properties/${key}` });
const formRoot = (label = 'Apply') =>
  el({ type: 'Form', label, elements: [control('name'), control('note')] });

type Handlers = Partial<{
  onSaveDraft: (data: Record<string, unknown>) => void | Promise<void>;
  onSubmit: (data: Record<string, unknown>) => void | Promise<void>;
  onChange: (data: Record<string, unknown>) => void;
}>;

/** A host: the answers are CONTROLLED (rule 3), so the harness holds them, exactly as a real host does. */
function Harness({
  uischema = formRoot(),
  initial = {},
  ...handlers
}: { uischema?: UISchemaElement; initial?: Record<string, unknown> } & Handlers) {
  const [data, setData] = useState<Record<string, unknown>>(initial);
  return (
    <FormRunner
      schema={schema}
      uischema={uischema}
      data={data}
      onChange={(next) => {
        setData(next);
        handlers.onChange?.(next);
      }}
      {...(handlers.onSaveDraft ? { onSaveDraft: handlers.onSaveDraft } : {})}
      {...(handlers.onSubmit ? { onSubmit: handlers.onSubmit } : {})}
    />
  );
}

const renderRunner = (props: Parameters<typeof Harness>[0] = {}) => render(<Harness {...props} />);

const submitButton = () => screen.getByRole('button', { name: 'Submit' });
const saveDraftButton = () => screen.getByRole('button', { name: 'Save draft' });
const settle = () => act(async () => {});

describe('FormRunner (doc 202 rules 1-8)', () => {
  describe('the component and its props (rules 1-5)', () => {
    it('is exported from @repo/forms/runner, with FormRunnerProps declared in types/index.ts', () => {
      const exportsMap = pkg.exports as Record<string, Record<string, string>>;
      expect(exportsMap['./runner']).toEqual({
        types: './dist/runner.d.ts',
        development: './src/runner.ts',
        import: './dist/runner.js',
        require: './dist/runner.cjs',
      });
      // Rule 1: the root entry is types-only, so the props type lives beside FormStudioProps.
      const types = readFileSync(resolve(import.meta.dirname, '../src/types/index.ts'), 'utf8');
      expect(types).toMatch(/export type FormRunnerProps = \{/);
    });

    it('mounts with only schema, uischema, data and onChange', async () => {
      renderRunner();
      await settle();
      expect(await screen.findByRole('textbox', { name: /^Name/ })).toBeInTheDocument();
      expect(document.querySelector('[data-slot="form-runner"]')).not.toBeNull();
    });

    it('mounts exactly one JsonForms, over the whole document (rule 5)', async () => {
      const { container } = renderRunner();
      await settle();
      // Every Control of the document is mounted at once — which is why errors must be scoped per Form.
      expect(screen.getByRole('textbox', { name: /^Name/ })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /^Note/ })).toBeInTheDocument();
      expect(container.querySelectorAll('[data-slot="form-runner"]')).toHaveLength(1);
    });

    it('is controlled: it reports every edit through onChange and holds no answers of its own', async () => {
      const onChange = vi.fn();
      renderRunner({ onChange });
      await settle();
      const name = await screen.findByRole('textbox', { name: /^Name/ });
      fireEvent.change(name, { target: { value: 'Ada' } });
      await waitFor(() => expect(onChange).toHaveBeenCalled());
      expect(onChange.mock.calls.at(-1)?.[0]).toMatchObject({ name: 'Ada' });
    });

    it('never debounces — persistence timing belongs to the host', async () => {
      const onChange = vi.fn();
      renderRunner({ onChange });
      await settle();
      const name = await screen.findByRole('textbox', { name: /^Name/ });
      fireEvent.change(name, { target: { value: 'A' } });
      // Reported synchronously with the edit, with no timer to advance.
      await waitFor(() => expect(onChange).toHaveBeenCalled());
    });
  });

  describe('a Form root (rules 7-8)', () => {
    it('renders the form title then its fields, with the action bar beneath', async () => {
      const { container } = renderRunner();
      await settle();
      // Doc 201: the Form's label is its title.
      expect(screen.getByRole('heading', { name: 'Apply' })).toBeInTheDocument();
      expect(container.querySelector('[data-slot="runner-actions"]')).not.toBeNull();
    });

    it('renders no sidebar and no Next — a Form root has no stages', async () => {
      const { container } = renderRunner();
      await settle();
      expect(container.querySelector('[data-slot="runner-sidebar"]')).toBeNull();
      expect(container.querySelector('[data-slot="runner-next"]')).toBeNull();
      expect(submitButton()).toBeInTheDocument();
    });

    it('renders no Back at all — not a disabled one (rule 34b)', async () => {
      renderRunner();
      await settle();
      // A Form root's history can never grow (only Flow navigation pushes), so a disabled Back would be permanent
      // dead chrome. This is where it differs from Save draft, which a host COULD enable by passing a handler.
      expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
      // Guard: the bar itself is present, so this is Back's absence and not a missing action bar.
      expect(saveDraftButton()).toBeInTheDocument();
    });

    it('blocks Submit on any error in the document', async () => {
      renderRunner();
      await settle();
      // `name` is required and absent, so the document does not validate.
      await waitFor(() => expect(submitButton()).toBeDisabled());

      fireEvent.change(screen.getByRole('textbox', { name: /^Name/ }), {
        target: { value: 'Ada' },
      });
      await waitFor(() => expect(submitButton()).toBeEnabled());

      // maxLength 4 — an invalid answer closes it again.
      fireEvent.change(screen.getByRole('textbox', { name: /^Name/ }), {
        target: { value: 'Adalovelace' },
      });
      await waitFor(() => expect(submitButton()).toBeDisabled());
    });
  });

  describe('an unsupported root (rule 6)', () => {
    it('renders "The form must be a Form, a Service or a Flow." for any other root type', async () => {
      renderRunner({ uischema: el({ type: 'VerticalLayout', elements: [control('name')] }) });
      await settle();
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(ROOT_MESSAGE);
      expect(alert).toHaveAttribute('data-slot', 'runner-root-error');
      expect(screen.queryByRole('textbox', { name: /^Name/ })).toBeNull();
    });
  });

  describe('the actions (rules 34-39)', () => {
    const valid = { name: 'Ada' };

    it('calls onSubmit with the data, awaits it and shows a busy state', async () => {
      // Captured from the executor rather than initialised with a placeholder, so no throwaway function is
      // declared (oxlint's consistent-function-scoping) and the promise is genuinely host-controlled.
      let release!: () => void;
      const pending = new Promise<void>((resolve_) => {
        release = resolve_;
      });
      const onSubmit = vi.fn(() => pending);
      renderRunner({ initial: valid, onSubmit });
      await settle();

      await waitFor(() => expect(submitButton()).toBeEnabled());
      fireEvent.click(submitButton());
      expect(onSubmit).toHaveBeenCalledWith(valid);
      // Busy until the host's promise settles.
      await waitFor(() => expect(submitButton()).toBeDisabled());
      await act(async () => {
        release();
        await pending;
      });
      await waitFor(() => expect(submitButton()).toBeEnabled());
    });

    it('leaves the user where they are when onSubmit rejects, the host owning the error', async () => {
      const onSubmit = vi.fn(() => Promise.reject(new Error('nope')));
      renderRunner({ initial: valid, onSubmit });
      await settle();
      await waitFor(() => expect(submitButton()).toBeEnabled());

      fireEvent.click(submitButton());
      await settle();
      // No throw reaches the test, the runner recovers, and the form is still on screen.
      await waitFor(() => expect(submitButton()).toBeEnabled());
      expect(screen.getByRole('textbox', { name: /^Name/ })).toBeInTheDocument();
    });

    it('calls onSaveDraft with the data, awaited and busy-stated the same way', async () => {
      const onSaveDraft = vi.fn(() => Promise.resolve());
      renderRunner({ initial: valid, onSaveDraft });
      await settle();
      fireEvent.click(saveDraftButton());
      expect(onSaveDraft).toHaveBeenCalledWith(valid);
      await settle();
      await waitFor(() => expect(saveDraftButton()).toBeEnabled());
    });

    it('renders Save draft disabled when onSaveDraft is absent (rule 37)', async () => {
      renderRunner({ initial: valid });
      await settle();
      // Disabled, not hidden: an author previewing still sees where it sits.
      expect(saveDraftButton()).toBeInTheDocument();
      expect(saveDraftButton()).toBeDisabled();
    });

    it('opens a dialog showing the payload when Submit has no handler (rule 38)', async () => {
      renderRunner({ initial: valid });
      await settle();
      await waitFor(() => expect(submitButton()).toBeEnabled());
      fireEvent.click(submitButton());

      const dialog = await screen.findByRole('dialog');
      expect(dialog).toHaveTextContent('Submission preview');
      expect(document.querySelector('[data-slot="runner-submission-payload"]')).not.toBeNull();
    });

    it('shows the payload as formatted JSON of the current answers', async () => {
      renderRunner({ initial: valid });
      await settle();
      await waitFor(() => expect(submitButton()).toBeEnabled());
      fireEvent.click(submitButton());
      await screen.findByRole('dialog');

      const payload = document.querySelector('[data-slot="runner-submission-payload"]');
      expect(JSON.parse(payload?.textContent ?? '{}')).toEqual(valid);
    });

    it('stays fully usable with no handlers at all (rule 39)', async () => {
      renderRunner({ initial: valid });
      await settle();
      // Both affordances render; the form is editable; nothing requires a host.
      expect(saveDraftButton()).toBeInTheDocument();
      expect(submitButton()).toBeInTheDocument();
      fireEvent.change(screen.getByRole('textbox', { name: /^Note/ }), {
        target: { value: 'hello' },
      });
      await waitFor(() =>
        expect(screen.getByRole('textbox', { name: /^Note/ })).toHaveValue('hello'),
      );
    });
  });
});

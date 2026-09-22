import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FormStudio } from '../src/studio';
import { STUDIO_SAMPLE_SCHEMA, STUDIO_SAMPLE_UISCHEMA } from '../src/studio/sample';
import type { StudioDocument } from '../src/types/index';
import { useXyflowJsdom } from './xyflow-jsdom';

// Doc 200 rules 1, 3, 22-23 — the lifecycle through the real FormStudio: the new default, a
// host-supplied loadDocument, and the stubbed save channel.

useXyflowJsdom();

const el = (element: object) => element as StudioDocument['uischema'];

/** Picks a card and confirms it — rule 11 needs both steps. */
async function choose(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole('radio', { name: label }));
  await user.click(screen.getByRole('button', { name: 'Create' }));
}

const LOADED: StudioDocument = {
  schema: { type: 'object', properties: { who: { type: 'string', title: 'Who is applying' } } },
  uischema: el({ type: 'Form', elements: [{ type: 'Control', scope: '#/properties/who' }] }),
};

describe('FormStudio document lifecycle', () => {
  describe('the new default (rule 23)', () => {
    it('opens the New form dialog when rendered with no props', () => {
      render(<FormStudio />);

      expect(screen.getByRole('dialog', { name: 'New form' })).toBeInTheDocument();
      expect(screen.getAllByRole('radio')).toHaveLength(4);
    });

    it('does not render the built-in sample when rendered with no props', () => {
      render(<FormStudio />);

      expect(screen.queryByText('Hello, FormStudio!')).toBeNull();
    });

    it('still renders a seeded document exactly as before', () => {
      // Rule 2 — the seam every existing test relies on.
      render(<FormStudio schema={STUDIO_SAMPLE_SCHEMA} uischema={STUDIO_SAMPLE_UISCHEMA} />);

      expect(screen.getByText('Hello, FormStudio!')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.getByRole('group', { name: 'Panels' })).toBeInTheDocument();
    });
  });

  describe('choosing a document', () => {
    it('renders the built-in sample after choosing Basic Form Template', async () => {
      const user = userEvent.setup();
      render(<FormStudio />);

      await choose(user, 'Basic Form Template');

      expect(await screen.findByText('Hello, FormStudio!')).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('renders a Flow with its first Stage and Form after choosing New Multi-Stage Form', async () => {
      const user = userEvent.setup();
      render(<FormStudio />);

      await choose(user, 'New Multi-Stage Form');

      // A new multi-stage form opens with one Stage holding one untitled Form, not an empty canvas.
      expect(await screen.findByText('Stage 1')).toBeInTheDocument();
      expect(await screen.findByText('Untitled form')).toBeInTheDocument();
      expect(screen.queryByText('Add a stage to get started.')).toBeNull();
    });

    it('renders an empty Form canvas after choosing New Basic Form', async () => {
      const user = userEvent.setup();
      render(<FormStudio />);

      await choose(user, 'New Basic Form');

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      const root = document.querySelector(
        '[data-slot="form-studio-center-panel"] [data-element-type]',
      );
      expect(root).toHaveAttribute('data-element-type', 'Form');
      expect(screen.queryByText('Hello, FormStudio!')).toBeNull();
    });

    it('renders the linear template after choosing Multi-Stage Template', async () => {
      const user = userEvent.setup();
      render(<FormStudio />);

      await choose(user, 'Multi-Stage Template');

      expect(await screen.findByText('Applicant')).toBeInTheDocument();
      expect(await screen.findByText('Review')).toBeInTheDocument();
    });

    it('makes the dock panels available once a document is open', async () => {
      const user = userEvent.setup();
      render(<FormStudio />);
      expect(screen.queryByRole('group', { name: 'Panels' })).toBeNull();

      await choose(user, 'Basic Form Template');

      expect(await screen.findByRole('group', { name: 'Panels' })).toBeInTheDocument();
    });
  });

  describe('loading an existing document (rules 1, 4)', () => {
    it('shows the loading state then the loaded document', async () => {
      const load = () => Promise.resolve(LOADED);
      render(<FormStudio loadDocument={load} />);

      expect(document.querySelector('[data-slot="form-studio-loading"]')).toBeInTheDocument();

      expect(await screen.findByText('Who is applying')).toBeInTheDocument();
    });

    it('shows the existing root error when the loaded root is neither Form nor Flow', async () => {
      // Rule 4: one root-error path — studio-canvas.tsx, not a second message.
      const load = () =>
        Promise.resolve({
          schema: { type: 'object', properties: {} },
          uischema: el({ type: 'VerticalLayout', elements: [] }),
        });
      render(<FormStudio loadDocument={load} />);

      expect(
        await screen.findByText('The root element must be a Form, a Service or a Flow.'),
      ).toBeInTheDocument();
    });

    it('lets the loaded document be edited like a seeded one', async () => {
      const load = () => Promise.resolve(LOADED);
      render(<FormStudio loadDocument={load} />);
      await screen.findByText('Who is applying');

      // The full editing shell is present, not a read-only rendering of the loaded document.
      expect(screen.getByRole('group', { name: 'Panels' })).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: 'Element path' })).toBeInTheDocument();
    });

    it('re-resolves the focused Form address against the newly loaded document', async () => {
      // Doc 197: a new document mints a fresh seed, which clears the focus hook's ref.
      const flow = el({
        type: 'Flow',
        options: { edges: [] },
        elements: [
          {
            type: 'Stage',
            label: 'Only stage',
            options: { id: 's1' },
            elements: [
              {
                type: 'Form',
                label: 'Details',
                options: { id: 'f1' },
                elements: [{ type: 'Control', scope: '#/properties/who' }],
              },
            ],
          },
        ],
      });
      const load = () => Promise.resolve({ schema: LOADED.schema, uischema: flow });
      render(<FormStudio loadDocument={load} focusedForm="f1" onFocusedFormChange={vi.fn()} />);

      // The address resolved against the document that arrived asynchronously, so the Form is drilled into.
      expect(await screen.findByText('Who is applying')).toBeInTheDocument();
    });
  });

  describe('the save stub (rule 22)', () => {
    it('calls onSaveDocument with the current document', async () => {
      const user = userEvent.setup();
      const onSaveDocument = vi.fn();
      render(
        <FormStudio
          schema={STUDIO_SAMPLE_SCHEMA}
          uischema={STUDIO_SAMPLE_UISCHEMA}
          onSaveDocument={onSaveDocument}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(onSaveDocument).toHaveBeenCalledTimes(1);
      expect(onSaveDocument).toHaveBeenCalledWith({
        schema: STUDIO_SAMPLE_SCHEMA,
        uischema: STUDIO_SAMPLE_UISCHEMA,
      });
    });

    it('renders no save affordance when onSaveDocument is absent', () => {
      render(<FormStudio schema={STUDIO_SAMPLE_SCHEMA} uischema={STUDIO_SAMPLE_UISCHEMA} />);

      expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    });
  });
});

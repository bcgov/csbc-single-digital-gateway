import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as studio from '../src/renderers-studio';
import * as ui from '../src/renderers-ui';
import * as xyflow from '../src/renderers-xyflow';
import { FormStudio } from '../src/studio';
import { useXyflowJsdom } from './xyflow-jsdom';

/** Doc 184 rule 19: entering and leaving preview are two buttons now, so one matcher finds whichever shows. */
const PREVIEW_BUTTON = /^(Preview|Exit preview)$/;

// Doc 195 rules 20-24 — a Flow root in the Form Studio.

useXyflowJsdom();

const schema: JsonSchema = { type: 'object', properties: {} };
const testerContext = { rootSchema: schema, config: {} };
const el = (element: object) => element as UISchemaElement;

const FLOW = el({
  type: 'Flow',
  options: { edges: [{ id: 'e1', source: 's1', target: 's2' }] },
  elements: [
    {
      type: 'Stage',
      label: 'Applicant',
      id: 's1',
      elements: [{ type: 'Form', label: 'Contact', elements: [] }],
    },
    {
      type: 'Stage',
      label: 'Review',
      id: 's2',
      elements: [{ type: 'Form', label: 'Decision', elements: [] }],
    },
  ],
});

function required<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`missing ${what}`);
  return value;
}

const centre = () =>
  required(
    document.querySelector<HTMLElement>('[data-slot="form-studio-center-panel"]'),
    'centre panel',
  );
const frameOf = (type: string, label?: string) => {
  const frames = [
    ...document.querySelectorAll<HTMLElement>(
      `[data-slot="studio-element"][data-element-type="${type}"]`,
    ),
  ];
  const frame =
    label === undefined ? frames[0] : frames.find((f) => f.textContent?.includes(label));
  return required(frame, `${type} frame`);
};
const contentOf = (frame: HTMLElement) =>
  required(frame.querySelector<HTMLElement>(':scope > [data-slot="studio-content"]'), 'content');
const trail = () => screen.getByRole('navigation', { name: 'Element path' });
const crumbNames = () =>
  within(trail())
    .queryAllByRole('button')
    .map((button) => button.getAttribute('aria-label') ?? button.textContent);
const currentCrumb = () => trail().querySelector('[aria-current="page"]')?.textContent ?? null;
const inspector = () =>
  required(document.querySelector<HTMLElement>('[data-studio-inspector]'), 'inspector');
const press = (element: HTMLElement) => {
  fireEvent.pointerDown(element);
  fireEvent.pointerUp(element);
};

const renderStudio = (uischema: UISchemaElement = FLOW) =>
  render(<FormStudio schema={schema} uischema={uischema} />);

describe('Form Studio Flow root (doc 195)', () => {
  describe('renderer set (rule 20)', () => {
    // Doc 199 rule 17: the Condition is a third xyflow entry, so the set grew to ui + 7; doc 212's Section
    // makes it ui + 8, and doc 215's Service ui + 9.
    it('renders/studio spreads the xyflow layout renderers, framed: ui + 11 layout entries', () => {
      expect(studio.layoutRenderers).toHaveLength(ui.layoutRenderers.length + 11); // doc 216: +2
      const [flowEntry, stageEntry, conditionEntry] = studio.layoutRenderers.slice(-3);
      expect(flowEntry?.tester).toBe(xyflow.layoutRenderers[0]?.tester);
      expect(stageEntry?.tester).toBe(xyflow.layoutRenderers[1]?.tester);
      expect(conditionEntry?.tester).toBe(xyflow.layoutRenderers[2]?.tester);
      // Framed: the tester is kept, the renderer is wrapped.
      expect(flowEntry?.renderer).not.toBe(xyflow.layoutRenderers[0]?.renderer);
      expect(conditionEntry?.renderer).not.toBe(xyflow.layoutRenderers[2]?.renderer);
      const matching = (type: string) =>
        studio.layoutRenderers.filter((entry) => entry.tester({ type }, schema, testerContext) > 0);
      expect(matching('Flow')).toHaveLength(1);
      expect(matching('Stage')).toHaveLength(1);
      expect(matching('Condition')).toHaveLength(1);
    });
  });

  describe('root check (rule 21)', () => {
    it('renders the Flow canvas for a Flow uischema prop, with no root error', () => {
      renderStudio();
      expect(centre().querySelector('[data-slot="flow"] .react-flow')).not.toBeNull();
      expect(centre().querySelectorAll('[data-slot="stage-card"]')).toHaveLength(2);
      expect(within(centre()).queryByRole('alert')).toBeNull();
      expect(crumbNames()).toEqual(['Flow']);
    });

    it('shows "The root element must be a Form, a Service or a Flow." for any other root', () => {
      renderStudio(el({ type: 'Stage', id: 's1', elements: [] }));
      const alert = within(centre()).getByRole('alert');
      expect(alert).toHaveTextContent('The root element must be a Form, a Service or a Flow.');
      expect(alert).toHaveAttribute('data-slot', 'form-studio-root-error');
      expect(centre().querySelector('.react-flow')).toBeNull();
    });
  });

  describe('preview (rule 22)', () => {
    it('renders a fillable flow when previewing a Flow root (doc 202 rules 40, 46)', () => {
      renderStudio();
      fireEvent.click(screen.getByRole('button', { name: PREVIEW_BUTTON }));
      // Doc 202 rule 46: the "Flows can't be filled in yet." status is gone.
      expect(within(centre()).queryByRole('status')).toBeNull();
      // Doc 202 rule 40b: a Flow is previewed through <FormRunner>, so the author gets the citizen's real
      // experience — the stage sidebar AND the action bar. Hand-verification found that without the runner
      // preview showed a flow it could not walk through, which is why rule 40b exists.
      expect(centre().querySelector('[data-slot="fill-flow"]')).not.toBeNull();
      expect(centre().querySelector('[data-slot="runner-sidebar"]')).not.toBeNull();
      expect(centre().querySelector('[data-slot="runner-actions"]')).not.toBeNull();
      expect(within(centre()).getByRole('button', { name: 'Next' })).toBeInTheDocument();
      expect(centre().querySelector('.react-flow')).toBeNull();
      expect(within(centre()).queryByRole('alert')).toBeNull();
    });
  });

  describe('canvas (rule 23)', () => {
    it('keeps the Flow content interactive (no inert) and the Stage content locked', () => {
      renderStudio();
      const flowContent = contentOf(frameOf('Flow'));
      expect(flowContent).not.toHaveAttribute('inert');
      expect(flowContent).not.toHaveClass('pointer-events-none');
      // Doc 196 rule 13: the studio edits Flows, so a Stage is locked by pointer events only — not inert, which its
      // Form row buttons could not undo.
      const stageContent = contentOf(frameOf('Stage', 'Applicant'));
      expect(stageContent).not.toHaveAttribute('inert');
      expect(stageContent).toHaveClass('pointer-events-none');
    });

    it('makes the Flow frame and its studio-content h-full', () => {
      renderStudio();
      const frame = frameOf('Flow');
      expect(frame).toHaveClass('h-full');
      expect(contentOf(frame)).toHaveClass('h-full');
      expect(frameOf('Stage', 'Applicant')).not.toHaveClass('h-full');
    });
  });

  describe('selection, breadcrumbs, inspector, palette (rule 24)', () => {
    it('selects a Stage on press and names the path "Flow › <Stage label>"', () => {
      renderStudio();
      press(frameOf('Stage', 'Review'));
      expect(frameOf('Stage', 'Review')).toHaveAttribute('data-selected');
      expect(crumbNames()).toEqual(['Flow']);
      expect(currentCrumb()).toBe('Review');
    });

    it('shows only the Label setting for a selected Flow and a selected Stage', async () => {
      renderStudio();
      press(frameOf('Stage', 'Applicant'));
      expect(await within(inspector()).findByRole('textbox', { name: 'Label' })).toHaveValue(
        'Applicant',
      );
      // Doc 187 header: the element's label in the h2, its type beneath it.
      const header = () => required(inspector().querySelector('header'), 'inspector header');
      expect(within(inspector()).getByRole('heading', { level: 2 })).toHaveTextContent('Applicant');
      expect(header()).toHaveTextContent(/Stage$/);
      expect(within(inspector()).getAllByRole('textbox')).toHaveLength(1);

      press(frameOf('Flow'));
      // An unlabelled Flow is named by its type.
      await waitFor(() => expect(header()).toHaveTextContent(/^FlowFlow$/));
      expect(within(inspector()).getAllByRole('textbox')).toHaveLength(1);
      expect(within(inspector()).getByRole('textbox', { name: 'Label' })).toHaveValue('');
    });

    it('puts the palette out of reach entirely while the root is a Flow (doc 198 rules 17-19)', () => {
      renderStudio();
      // Doc 196 rule 17's Flow palette view is superseded: a Flow is authored on its canvas, so the whole left panel
      // and its toggle are gone. No palette template can reach a Flow document at all.
      expect(document.querySelector('[data-studio-palette]')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Left panel' })).toBeNull();
      expect(currentCrumb()).toBeNull();
      expect(crumbNames()).toEqual(['Flow']);
      expect(centre().querySelectorAll('[data-slot="stage-card"]')).toHaveLength(2);
      expect(centre().querySelectorAll('[data-slot="stage-form-row"]')).toHaveLength(2);
    });
  });
});

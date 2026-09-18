import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormStudio } from '../src/studio';
import { useXyflowJsdom } from './xyflow-jsdom';

// Deleting inside a drilled-in Form keeps the canvas on that Form. The selection is what focuses the canvas
// (doc 197 rule 12), so a delete that left it naming a removed element sent the author back to the Flow.

useXyflowJsdom();

const schema: JsonSchema = {
  type: 'object',
  properties: { name: { type: 'string', title: 'Name' }, city: { type: 'string', title: 'City' } },
};
const el = (element: object) => element as UISchemaElement;

/** Flow [ Applicant [ Contact 'f1' [ Name, Row [ City ] ] ] ]. */
const FLOW = el({
  type: 'Flow',
  elements: [
    {
      type: 'Stage',
      label: 'Applicant',
      options: { id: 's1' },
      elements: [
        {
          type: 'Form',
          label: 'Contact',
          options: { id: 'f1' },
          elements: [
            { type: 'Control', scope: '#/properties/name' },
            {
              type: 'HorizontalLayout',
              elements: [{ type: 'Control', scope: '#/properties/city' }],
            },
          ],
        },
      ],
    },
  ],
});

const centre = () =>
  document.querySelector<HTMLElement>('[data-slot="form-studio-center-panel"]') as HTMLElement;
const flowCanvas = () => centre().querySelector('.react-flow');
const rootFrameType = () =>
  centre()
    .querySelector(':scope > [data-slot="studio-element"]')
    ?.getAttribute('data-element-type');
const itemOf = (element: Element) => {
  const item = element.closest<HTMLElement>('[data-slot="studio-grid-item"]');
  if (!item) throw new Error('not inside a studio grid item');
  return item;
};

/** Selects the item holding `element` and deletes it through the actions popover and its confirmation. */
async function deleteElement(element: Element) {
  fireEvent.pointerDown(itemOf(element));
  const menu = await screen.findByRole('dialog', { name: 'Element actions' });
  fireEvent.click(within(menu).getByRole('button', { name: 'Delete' }));
  const dialog = await screen.findByRole('alertdialog', { name: 'Delete element?' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
}

/** Drills into Contact and waits for the Form canvas. */
async function openContact() {
  render(<FormStudio schema={schema} uischema={FLOW} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Open Contact' }));
  await waitFor(() => expect(flowCanvas()).toBeNull());
}

describe('deleting inside a drilled-in Form', () => {
  it('stays on the Form when a field is deleted', async () => {
    await openContact();
    await deleteElement(await screen.findByRole('textbox', { name: 'Name' }));

    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument(),
    );
    // The canvas is still the Form, not the Flow it was drilled into from.
    expect(flowCanvas()).toBeNull();
    expect(rootFrameType()).toBe('Form');
    expect(screen.getByRole('textbox', { name: 'City' })).toBeInTheDocument();
  });

  it('stays on the Form when a layout holding the selection is deleted', async () => {
    await openContact();
    const city = await screen.findByRole('textbox', { name: 'City' });
    await deleteElement(itemOf(city).parentElement as HTMLElement);

    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: 'City' })).not.toBeInTheDocument(),
    );
    expect(flowCanvas()).toBeNull();
    expect(rootFrameType()).toBe('Form');
  });
});

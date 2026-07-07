import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { FormBuilder } from '@/components/form-builder/form-builder';

const EMPTY: { schema: Record<string, unknown>; uischema: Record<string, unknown> } = {
  schema: { type: 'object', properties: {}, required: [] },
  uischema: { type: 'VerticalLayout', elements: [] },
};

/** Controlled host so tests can observe the emitted definition. */
function Harness({ initial = EMPTY }: { initial?: typeof EMPTY }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <FormBuilder value={value} onChange={setValue} />
      <pre data-testid="dump">{JSON.stringify(value)}</pre>
    </>
  );
}

const dump = () => JSON.parse(screen.getByTestId('dump').textContent ?? '{}');

describe('FormBuilder', () => {
  it('renders the three columns: palette, canvas, inspector', () => {
    render(<Harness />);
    expect(screen.getByRole('region', { name: /palette/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /canvas/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /inspector/i })).toBeInTheDocument();
  });

  it('shows form settings in the inspector when nothing is selected', () => {
    render(<Harness />);
    const inspector = screen.getByRole('region', { name: /inspector/i });
    expect(within(inspector).getByText(/form settings/i)).toBeInTheDocument();
  });

  it('filters palette items via the search box', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const palette = screen.getByRole('region', { name: /palette/i });
    await user.type(within(palette).getByRole('searchbox'), 'numb');
    expect(within(palette).getByRole('button', { name: /number/i })).toBeInTheDocument();
    expect(within(palette).queryByRole('button', { name: /^text$/i })).not.toBeInTheDocument();
  });

  it('adds a field to the canvas (click-to-add) and emits a control + property', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const palette = screen.getByRole('region', { name: /palette/i });
    await user.click(within(palette).getByRole('button', { name: /^text$/i }));
    const after = dump();
    expect(after.uischema.elements).toHaveLength(1);
    expect(after.uischema.elements[0].type).toBe('Control');
    expect(Object.keys(after.schema.properties)).toHaveLength(1);
  });

  it('edits the form title on the canvas, writing schema.title', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const canvas = screen.getByRole('region', { name: /canvas/i });
    const title = within(canvas).getByRole('textbox', { name: /^title$/i });
    await user.type(title, 'Apply now');
    expect(dump().schema.title).toBe('Apply now');
  });

  it('selecting a field shows its config in the inspector and edits its label', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const palette = screen.getByRole('region', { name: /palette/i });
    await user.click(within(palette).getByRole('button', { name: /^text$/i }));
    const canvas = screen.getByRole('region', { name: /canvas/i });
    await user.click(
      within(canvas).getByRole('button', { name: /select field|edit field|field 1/i }),
    );
    const inspector = screen.getByRole('region', { name: /inspector/i });
    const label = within(inspector).getByRole('textbox', { name: /label/i });
    await user.clear(label);
    await user.type(label, 'Email address');
    expect(JSON.stringify(dump())).toContain('Email address');
  });

  it('toggling required updates schema.required', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const palette = screen.getByRole('region', { name: /palette/i });
    await user.click(within(palette).getByRole('button', { name: /^text$/i }));
    const canvas = screen.getByRole('region', { name: /canvas/i });
    await user.click(
      within(canvas).getByRole('button', { name: /select field|edit field|field 1/i }),
    );
    const inspector = screen.getByRole('region', { name: /inspector/i });
    await user.click(within(inspector).getByRole('switch', { name: /required/i }));
    expect(dump().schema.required.length).toBe(1);
  });

  it('clears the selected field when focusing the form Title', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const palette = screen.getByRole('region', { name: /palette/i });
    await user.click(within(palette).getByRole('button', { name: /^text$/i }));
    const canvas = screen.getByRole('region', { name: /canvas/i });
    await user.click(within(canvas).getByRole('button', { name: /select field 1/i }));
    const inspector = screen.getByRole('region', { name: /inspector/i });
    expect(within(inspector).getByRole('heading', { name: /field settings/i })).toBeInTheDocument();
    // Focusing the form-level Title deselects the field → inspector returns to form settings.
    await user.click(within(canvas).getByRole('textbox', { name: /^title$/i }));
    expect(within(inspector).getByRole('heading', { name: /form settings/i })).toBeInTheDocument();
  });

  it('selects a layout container and shows section settings in the inspector', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const palette = screen.getByRole('region', { name: /palette/i });
    await user.click(within(palette).getByRole('button', { name: /^group$/i }));
    const canvas = screen.getByRole('region', { name: /canvas/i });
    await user.click(within(canvas).getByRole('button', { name: /select section/i }));
    const inspector = screen.getByRole('region', { name: /inspector/i });
    expect(within(inspector).getByRole('textbox', { name: /section title/i })).toBeInTheDocument();
  });

  it('deletes a field from the canvas', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const palette = screen.getByRole('region', { name: /palette/i });
    await user.click(within(palette).getByRole('button', { name: /^text$/i }));
    const canvas = screen.getByRole('region', { name: /canvas/i });
    await user.click(within(canvas).getByRole('button', { name: /delete|remove/i }));
    expect(dump().uischema.elements).toHaveLength(0);
  });

  describe('display fields (inline editing)', () => {
    it('edits a heading inline on the canvas, writing a Label element (no property)', async () => {
      const user = userEvent.setup();
      render(<Harness />);
      const palette = screen.getByRole('region', { name: /palette/i });
      await user.click(within(palette).getByRole('button', { name: /^heading$/i }));
      const canvas = screen.getByRole('region', { name: /canvas/i });
      const input = within(canvas).getByRole('textbox', { name: /^heading$/i });
      await user.clear(input);
      await user.type(input, 'Your details');
      const after = dump();
      expect(after.uischema.elements[0]).toMatchObject({
        type: 'Label',
        text: 'Your details',
        options: { format: 'heading' },
      });
      // A display field collects no data.
      expect(Object.keys(after.schema.properties)).toHaveLength(0);
    });

    it('selecting a heading shows its settings in the inspector and switches level', async () => {
      const user = userEvent.setup();
      render(<Harness />);
      const palette = screen.getByRole('region', { name: /palette/i });
      await user.click(within(palette).getByRole('button', { name: /^heading$/i }));
      const canvas = screen.getByRole('region', { name: /canvas/i });
      // Selecting the card (focusing its inline input) opens the inspector for this display field.
      await user.click(within(canvas).getByRole('textbox', { name: /^heading$/i }));
      const inspector = screen.getByRole('region', { name: /inspector/i });
      expect(within(inspector).getByRole('heading', { name: /content/i })).toBeInTheDocument();
      await user.click(within(inspector).getByRole('button', { name: /subheading/i }));
      expect(dump().uischema.elements[0].options.level).toBe(3);
    });

    it('edits a paragraph inline on the canvas', async () => {
      const user = userEvent.setup();
      render(<Harness />);
      const palette = screen.getByRole('region', { name: /palette/i });
      await user.click(within(palette).getByRole('button', { name: /^paragraph$/i }));
      const canvas = screen.getByRole('region', { name: /canvas/i });
      const input = within(canvas).getByRole('textbox', { name: /^paragraph$/i });
      await user.clear(input);
      await user.type(input, 'Please read.');
      expect(dump().uischema.elements[0]).toMatchObject({
        type: 'Label',
        text: 'Please read.',
        options: { format: 'paragraph' },
      });
    });

    it('sets paragraph alignment via the inspector', async () => {
      const user = userEvent.setup();
      render(<Harness />);
      const palette = screen.getByRole('region', { name: /palette/i });
      await user.click(within(palette).getByRole('button', { name: /^paragraph$/i }));
      const canvas = screen.getByRole('region', { name: /canvas/i });
      await user.click(within(canvas).getByRole('textbox', { name: /^paragraph$/i }));
      const inspector = screen.getByRole('region', { name: /inspector/i });
      await user.click(within(inspector).getByRole('button', { name: /align center/i }));
      expect(dump().uischema.elements[0].options.align).toBe('center');
    });

    it('renders a rich-text editor inline on the canvas for a rich-text display field', async () => {
      const user = userEvent.setup();
      render(<Harness />);
      const palette = screen.getByRole('region', { name: /palette/i });
      // Two "Rich text" palette items: the data-collecting control (Rich text group) then the
      // display field (Display group). The second is the display one.
      const richTextButtons = within(palette).getAllByRole('button', { name: /^rich text$/i });
      await user.click(richTextButtons[richTextButtons.length - 1] as HTMLElement);
      const canvas = screen.getByRole('region', { name: /canvas/i });
      // The inline editor exposes its formatting toolbar (proof an editable input is present).
      expect(within(canvas).getByRole('toolbar', { name: /formatting/i })).toBeInTheDocument();
      expect(dump().uischema.elements[0].options.format).toBe('richtext');
    });
  });
});

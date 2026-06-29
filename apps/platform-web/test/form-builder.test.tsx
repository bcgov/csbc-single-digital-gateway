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
});

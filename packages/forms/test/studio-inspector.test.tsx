import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FormStudio } from '../src/studio';

// Doc 187 rules 15-29 — the inspector in the Form Studio's right panel, end to end.
//
// JSDOM TRAP (CLAUDE.md): react-resizable-panels prevents default on every pointerdown in jsdom, so a
// clicked field never focuses — number fields are focused programmatically and typed with skipClick.

const EMPTY = 'Select an element to configure it.';

const itemOf = (element: Element) => {
  const item = element.closest<HTMLElement>('[data-slot="studio-grid-item"]');
  if (!item) throw new Error('not inside a studio grid item');
  return item;
};

const inspector = () => document.querySelector<HTMLElement>('[data-studio-inspector]');
const inInspector = () => {
  const node = inspector();
  if (!node) throw new Error('no inspector');
  return within(node);
};
const field = (name: string) => inInspector().getByRole<HTMLInputElement>('textbox', { name });
const toggle = (name: string) => inInspector().getByRole('switch', { name });
const combobox = (name: string) => inInspector().getByRole<HTMLInputElement>('combobox', { name });
const component = () => combobox('Component');

/**
 * Picks `option` from the inspector combobox named `name` (Component, doc 188 rule 26; whole-number settings, rule
 * 11b) — keyboard-opened, see the trap above.
 */
async function pick(name: string, option: string) {
  const input = combobox(name);
  input.focus();
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: option }));
}
const rightToggle = () => screen.getByRole('button', { name: 'Right panel' });
const canvasField = (name: string | RegExp) => screen.getByRole('textbox', { name });

const press = (element: Element) => fireEvent.pointerDown(element);
const release = () => fireEvent.pointerUp(document);
const select = (element: Element) => {
  press(element);
  release();
};

/** Replaces a number field's text by typing, as an author would. */
async function typeNumber(
  user: ReturnType<typeof userEvent.setup>,
  input: HTMLInputElement,
  text: string,
) {
  input.focus();
  input.setSelectionRange(0, input.value.length);
  await user.type(input, text, { skipClick: true });
  fireEvent.blur(input);
}

async function renderStudio() {
  const view = render(<FormStudio />);
  const name = itemOf(await screen.findByRole('textbox', { name: 'Name' }));
  const city = itemOf(screen.getByRole('textbox', { name: 'City' }));
  const greeting = itemOf(screen.getByRole('heading', { name: 'Hello, FormStudio!' }));
  const centre = view.container.querySelector<HTMLElement>(
    '[data-slot="form-studio-center-panel"]',
  );
  const right = view.container.querySelector<HTMLElement>('[data-slot="form-studio-right-panel"]');
  if (!centre || !right) throw new Error('studio panels missing');
  return { ...view, name, city, greeting, centre, right };
}

describe('opening the right panel (rules 26-28)', () => {
  it('starts closed, holding the empty inspector', async () => {
    const { right } = await renderStudio();
    expect(rightToggle()).toHaveAttribute('aria-pressed', 'false');
    expect(right).toHaveAttribute('inert');
    expect(right).toContainElement(inspector());
    expect(inspector()).toHaveTextContent(EMPTY);
  });

  it('opens when the press that selected an element is released, not before', async () => {
    const { name, right } = await renderStudio();
    press(name);
    expect(itemOf(canvasField('Name'))).toHaveAttribute('data-selected');
    expect(rightToggle()).toHaveAttribute('aria-pressed', 'false');

    release();
    expect(rightToggle()).toHaveAttribute('aria-pressed', 'true');
    expect(right).not.toHaveAttribute('inert');
  });

  it('stays closed after closing it by hand until the selection changes to another element', async () => {
    const { name, city } = await renderStudio();
    select(name);
    fireEvent.click(rightToggle());
    expect(rightToggle()).toHaveAttribute('aria-pressed', 'false');

    select(name);
    expect(rightToggle()).toHaveAttribute('aria-pressed', 'false');

    select(city);
    expect(rightToggle()).toHaveAttribute('aria-pressed', 'true');
  });

  it('opens when Escape selects the parent', async () => {
    const { name } = await renderStudio();
    select(name);
    fireEvent.click(rightToggle());
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(rightToggle()).toHaveAttribute('aria-pressed', 'true');
  });

  it('never closes when the selection is cleared, showing the empty state', async () => {
    const { name, centre } = await renderStudio();
    select(name);
    select(centre);
    expect(itemOf(canvasField('Name'))).not.toHaveAttribute('data-selected');
    expect(rightToggle()).toHaveAttribute('aria-pressed', 'true');
    expect(inspector()).toHaveTextContent(EMPTY);
  });
});

describe('inspector content (rules 9, 14, 23-24)', () => {
  it("shows the selected element's label, type and sections", async () => {
    const { name } = await renderStudio();
    select(name);
    expect(inInspector().getByRole('heading', { name: 'Name' })).toBeInTheDocument();
    expect(inspector()).toHaveTextContent('Control');
    expect(inspector()).not.toHaveTextContent(EMPTY);
    const legends = Array.from(
      inspector()?.querySelectorAll('[data-slot="inspector-section"] > legend') ?? [],
    ).map((legend) => legend.textContent);
    expect(legends).toEqual(['General', 'Validation', 'Appearance']);
  });

  it('reads the element and its property into the fields', async () => {
    const { name } = await renderStudio();
    select(name);
    expect(field('Label')).toHaveValue('');
    expect(field('Label')).toHaveAttribute('placeholder', 'Name');
    expect(field('Placeholder')).toHaveValue('Jane Doe');
    expect(field('Max length')).toHaveValue('80');
    expect(toggle('Required')).toHaveAttribute('aria-checked', 'false');
    // Doc 188 rule 27: an absent component reads as the default.
    expect(component()).toHaveValue('Input');
  });

  it("shows the next element's settings when the selection moves", async () => {
    const { name, city } = await renderStudio();
    select(name);
    expect(field('Label')).toHaveAttribute('placeholder', 'Name');
    select(city);
    await waitFor(() => expect(field('Label')).toHaveAttribute('placeholder', 'City'));
    expect(combobox('Width')).toHaveValue('8');
  });
});

describe('live editing (rules 15-21)', () => {
  it('writes Label to the canvas and keeps the element selected', async () => {
    const { name } = await renderStudio();
    select(name);
    fireEvent.change(field('Label'), { target: { value: 'Full name' } });

    const renamed = await waitFor(() => canvasField('Full name'));
    expect(itemOf(renamed)).toHaveAttribute('data-selected');
    expect(inInspector().getByRole('heading', { name: 'Full name' })).toBeInTheDocument();
  });

  it('marks the canvas field required from the Required switch', async () => {
    const { name } = await renderStudio();
    select(name);
    fireEvent.click(toggle('Required'));
    await waitFor(() => expect(canvasField(/^Name\s*\*$/)).toBeInTheDocument());
    expect(toggle('Required')).toHaveAttribute('aria-checked', 'true');
  });

  it('turns the canvas field into a textarea from the Component combobox', async () => {
    const { name } = await renderStudio();
    select(name);
    await pick('Component', 'Textarea');
    await waitFor(() => expect(canvasField('Name').tagName).toBe('TEXTAREA'));
  });

  it('turns the canvas Province combobox into a radio group (doc 188 rule 28)', async () => {
    await renderStudio();
    select(itemOf(screen.getByRole('combobox', { name: 'Province' })));
    expect(component()).toHaveValue('Combobox');
    await pick('Component', 'Radio group');
    await waitFor(() =>
      expect(screen.getByRole('radiogroup', { name: 'Province' })).toBeInTheDocument(),
    );
  });

  it("changes the canvas heading's level from its combobox (rule 11b)", async () => {
    const { greeting } = await renderStudio();
    select(greeting);
    expect(combobox('Heading level')).toHaveValue('1');
    await pick('Heading level', '3');
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { level: 3, name: 'Hello, FormStudio!' }),
      ).toBeInTheDocument(),
    );
  });

  it("writes Width to a Grid child's placement from its combobox (rule 11b)", async () => {
    const { city } = await renderStudio();
    select(city);
    await pick('Width', '6');
    await waitFor(() => expect(city.closest('.grid-stack-item')).toHaveAttribute('gs-w', '6'));
  });

  // NumberInput's min (from the field schema's minimum: 0) refuses a typed '-', so the reachable invalid
  // value is a fraction, which fails multipleOf: 1.
  it('shows an invalid value as an error without writing it', async () => {
    const user = userEvent.setup();
    const { name } = await renderStudio();
    select(name);
    await typeNumber(user, field('Max length'), '2.5');
    expect(await inInspector().findByRole('alert')).toHaveTextContent(/multiple of 1/);
    expect(canvasField('Name')).toHaveAttribute('maxlength', '80');
  });
});

describe('canvas validation (rule 25b)', () => {
  it('shows no validation errors on the canvas when a field becomes required', async () => {
    const { name, centre } = await renderStudio();
    select(name);
    fireEvent.click(toggle('Required'));
    await waitFor(() => expect(canvasField(/^Name\s*\*$/)).toBeInTheDocument());

    expect(centre.querySelector('[data-slot="field-error"]')).toBeNull();
    expect(canvasField(/^Name\s*\*$/)).not.toHaveAttribute('aria-invalid');
  });

  it('still validates the fillable preview', async () => {
    const { name } = await renderStudio();
    select(name);
    fireEvent.click(toggle('Required'));
    await waitFor(() => expect(canvasField(/^Name\s*\*$/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(await screen.findByText('is a required property')).toBeInTheDocument();
  });
});

describe('keyboard and preview (rules 25, 29)', () => {
  it('leaves the selection alone when Escape is pressed inside the inspector', async () => {
    const { name } = await renderStudio();
    select(name);
    fireEvent.keyDown(field('Label'), { key: 'Escape' });
    expect(itemOf(canvasField('Name'))).toHaveAttribute('data-selected');
  });

  it('renders no inspector while previewing', async () => {
    const { name } = await renderStudio();
    select(name);
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    await waitFor(() => expect(inspector()).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    await screen.findByRole('textbox', { name: 'Name' });
    expect(inspector()).toHaveTextContent(EMPTY);
  });
});

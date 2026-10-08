import { JsonForms } from '@jsonforms/react';
import { fireEvent, render, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import * as ui from '../src/renderers/ui/index';
import { inputControlTester } from '../src/renderers/ui/input-control';
import { textareaControlTester } from '../src/renderers/ui/textarea-control';

const baseSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      title: 'Full name',
      description: 'As it appears on your ID',
      minLength: 2,
      maxLength: 10,
    },
    bio: { type: 'string', title: 'Bio' },
    region: { type: 'string', oneOf: [{ const: 'a', title: 'A' }] },
  },
  required: ['name'],
};

const control = (scope: string, options: Record<string, unknown> = {}, extra = {}) => ({
  type: 'Control',
  scope: `#/properties/${scope}`,
  options,
  ...extra,
});

function renderControl(
  uischema: Record<string, unknown>,
  data: Record<string, unknown> = {},
  props: { readonly?: boolean } = {},
) {
  const onChange = vi.fn<(data: Record<string, unknown>) => void>();
  const view = render(
    <JsonForms
      schema={baseSchema}
      uischema={uischema as never}
      data={data}
      renderers={ui.renderers}
      cells={ui.cells}
      onChange={({ data: next }) => onChange(next as Record<string, unknown>)}
      {...props}
    />,
  );
  const field = () => view.container.querySelector<HTMLElement>('[data-slot="text-field"]')!;
  const lastData = () => onChange.mock.calls.at(-1)?.[0];
  return { ...view, field, lastData };
}

const ctx = { rootSchema: baseSchema, config: {} } as never;
const ranksFor = (uischema: Record<string, unknown>) =>
  ui.renderers
    .map((r) => r.tester(uischema as never, baseSchema as never, ctx))
    .toSorted((a, b) => b - a);

describe('string controls (doc 239)', () => {
  describe('dispatch (rules 1-2)', () => {
    it('ranks the Input 1 and the Textarea 2, never tied', () => {
      expect(ranksFor(control('bio'))[0]).toBe(1);
      const [top, next] = ranksFor(control('bio', { component: 'textarea' }));
      expect(top).toBe(2);
      expect(next).toBe(1);
    });

    it('renders an Input, or a Textarea for options.component textarea', () => {
      const input = renderControl(control('bio'));
      expect(input.field()).toHaveAttribute('data-component', 'input');
      expect(within(input.field()).getByRole('textbox').tagName).toBe('INPUT');
      input.unmount();
      const area = renderControl(control('bio', { component: 'textarea' }));
      expect(area.field()).toHaveAttribute('data-component', 'textarea');
      expect(within(area.field()).getByRole('textbox').tagName).toBe('TEXTAREA');
    });

    it('leaves choice strings (oneOf) to the single-choice renderer (doc 244)', () => {
      const string = [inputControlTester, textareaControlTester];
      for (const options of [{}, { component: 'textarea' }]) {
        for (const tester of string) {
          expect(
            tester(control('region', options) as never, baseSchema as never, ctx),
          ).toBeLessThan(1);
        }
      }
    });
  });

  describe('value (rules 3-5)', () => {
    it('shows a string value, and empty for anything else', () => {
      const a = renderControl(control('bio'), { bio: 'Hello' });
      expect(within(a.field()).getByRole('textbox')).toHaveValue('Hello');
      a.unmount();
      const b = renderControl(control('bio'), { bio: 42 });
      expect(within(b.field()).getByRole('textbox')).toHaveValue('');
    });

    it('writes typed text, and undefined — never an empty string — when cleared', async () => {
      const { field, lastData } = renderControl(control('bio'), { bio: 'Hi' });
      const box = within(field()).getByRole('textbox');
      fireEvent.change(box, { target: { value: 'Hello' } });
      await waitFor(() => expect(lastData()).toEqual({ bio: 'Hello' }));
      fireEvent.change(box, { target: { value: '' } });
      await waitFor(() => expect(lastData()).toEqual({}));
      expect(Object.keys(lastData()!)).not.toContain('bio');
    });

    it('is disabled when not enabled, and renders nothing when hidden', () => {
      const disabled = renderControl(control('bio'), {}, { readonly: true });
      expect(within(disabled.field()).getByRole('textbox')).toBeDisabled();
      disabled.unmount();
      const rule = { effect: 'HIDE', condition: { scope: '#', schema: {} } };
      const hidden = renderControl(control('bio', {}, { rule }));
      expect(hidden.container.querySelector('[data-slot="text-field"]')).toBeNull();
    });
  });

  describe('layout (rules 6-8)', () => {
    it('stacks label, description, control, counter — description under the label', () => {
      const { field } = renderControl(control('name'));
      const order = [...field().children].map((c) => c.getAttribute('data-slot'));
      // `name` is required, so its label sits in a line with the marker (doc 285 rule 5).
      expect(order).toEqual([
        'control-label-line',
        'field-description',
        'input',
        'character-count',
      ]);
    });

    it('labels and describes the control, the counter first in aria-describedby', () => {
      const { field } = renderControl(control('name'));
      const box = within(field()).getByRole('textbox', { name: /Full name/ });
      const ids = box.getAttribute('aria-describedby')!.split(' ');
      expect(ids).toHaveLength(2);
      expect(document.getElementById(ids[0]!)).toHaveAttribute('data-slot', 'character-count');
      expect(document.getElementById(ids[1]!)).toHaveTextContent('As it appears on your ID');
    });

    it('marks a required field: asterisk right of the label line, required and aria-required on the control', () => {
      const required = renderControl(control('name'));
      const label = required.field().querySelector('label')!;
      expect(label).toHaveTextContent(/^Full name$/);
      const line = required.field().querySelector('[data-slot="control-label-line"]')!;
      expect([...line.children].map((c) => c.getAttribute('data-slot'))).toEqual([
        'field-label',
        'required-marker',
      ]);
      expect(line.lastElementChild).toHaveAttribute('aria-hidden', 'true');
      const box = within(required.field()).getByRole('textbox');
      expect(box).toBeRequired();
      expect(box).toHaveAttribute('aria-required', 'true');
      required.unmount();
      const optional = renderControl(control('bio'));
      expect(optional.field().querySelector('label')).toHaveTextContent(/^Bio$/);
      expect(within(optional.field()).getByRole('textbox')).not.toBeRequired();
    });
  });

  describe('options (rules 9-10)', () => {
    it('passes minLength, maxLength and placeholder to the input', () => {
      const { field } = renderControl(control('name', { placeholder: 'Jane Doe' }));
      const box = within(field()).getByRole('textbox');
      expect(box).toHaveAttribute('minlength', '2');
      expect(box).toHaveAttribute('maxlength', '10');
      expect(box).toHaveAttribute('placeholder', 'Jane Doe');
    });

    it('gives a Textarea its rows (default 3) at a fixed height', () => {
      const a = renderControl(control('bio', { component: 'textarea', rows: 6 }));
      const area = within(a.field()).getByRole('textbox');
      expect(area).toHaveAttribute('rows', '6');
      expect(area).toHaveClass('field-sizing-fixed');
      a.unmount();
      const b = renderControl(control('bio', { component: 'textarea', rows: 50 }));
      expect(within(b.field()).getByRole('textbox')).toHaveAttribute('rows', '3');
    });
  });

  describe('counter (rule 11)', () => {
    it('shows length/maxLength right-aligned, updating as the value changes', async () => {
      const { field } = renderControl(control('name'), { name: 'Ann' });
      const counter = field().querySelector('[data-slot="character-count"]')!;
      expect(counter).toHaveTextContent('3/10');
      expect(counter).toHaveClass('text-right');
      fireEvent.change(within(field()).getByRole('textbox'), { target: { value: 'Annabel' } });
      await waitFor(() => expect(counter).toHaveTextContent('7/10'));
    });

    it('draws no counter without a maxLength', () => {
      const { field } = renderControl(control('bio'));
      expect(field().querySelector('[data-slot="character-count"]')).toBeNull();
    });
  });
});

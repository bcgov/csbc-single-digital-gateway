import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as defaults from '../src/renderers/default/index';
import * as studio from '../src/renderers/studio/index';
import { renderStudioRenderers, studioHeading } from './render-studio-renderers';

const schema = {
  type: 'object',
  properties: { resident: { type: 'boolean', title: 'BC resident' } },
};
const page = (elements: unknown[]) => ({ id: 'form', type: 'Form', label: 'Page', elements });

describe('studio boolean controls (doc 237 rules 13-15)', () => {
  it('wraps every default control entry, keeping its tester', () => {
    // Checkbox, Switch, Input, Textarea, the single (doc 244) and multiple choice (doc 245),
    // the number input (doc 248), the rich text field (doc 250) and the data table (doc 263).
    expect(defaults.controlRenderers).toHaveLength(11); // + the record (doc 271) and accordion input (doc 280)
    // Plus the studio data table, which outranks its default (doc 263 rule 18).
    // + studio data table, record and accordion input (doc 280)
    expect(studio.controlRenderers).toHaveLength(defaults.controlRenderers.length + 3);
    defaults.controlRenderers.forEach((entry, i) => {
      expect(studio.controlRenderers[i]!.tester).toBe(entry.tester);
      expect(studio.controlRenderers[i]!.renderer).not.toBe(entry.renderer);
    });
  });

  it('draws the field inside an inert body, so a click only selects it and never toggles', () => {
    for (const options of [{}, { component: 'switch' }]) {
      const { container, unmount } = renderStudioRenderers(
        page([{ id: 'c1', type: 'Control', scope: '#/properties/resident', options }]),
        { schema },
      );
      const wrapper = container.querySelector<HTMLElement>('[data-element-id="c1"]')!;
      const body = wrapper.querySelector('[data-slot="studio-element-body"]')!;
      expect(body).toHaveAttribute('inert');
      // Room between the wrapper's ring and the control (rule 13b).
      // ELEMENT_INSET (doc 254 rule 7).
      expect(body).toHaveClass('p-4');
      expect(body.querySelector('[data-slot="boolean-field"]')).not.toBeNull();
      fireEvent.click(wrapper);
      expect(wrapper).toHaveAttribute('data-selected', '');
      const control = body.querySelector('[role="checkbox"],[role="switch"]')!;
      expect(control).toHaveAttribute('aria-checked', 'false');
      unmount();
    }
  });

  it('leaves content elements interactive — a Heading still edits in place', () => {
    const { container } = renderStudioRenderers(page([studioHeading('h1', 'Hello')]));
    const wrapper = container.querySelector('[data-element-id="h1"]')!;
    expect(wrapper.querySelector('[inert]')).toBeNull();
    fireEvent.click(wrapper.querySelector('[data-slot="heading-element"]')!);
    expect(wrapper.querySelector('[data-slot="heading-element"]')).toHaveAttribute(
      'contenteditable',
      'plaintext-only',
    );
  });
});

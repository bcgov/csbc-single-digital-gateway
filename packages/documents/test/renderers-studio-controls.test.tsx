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
    // Checkbox, Switch, Input, Textarea and the single choice (doc 244).
    expect(defaults.controlRenderers).toHaveLength(5);
    expect(studio.controlRenderers).toHaveLength(defaults.controlRenderers.length);
    studio.controlRenderers.forEach((entry, i) => {
      expect(entry.tester).toBe(defaults.controlRenderers[i]!.tester);
      expect(entry.renderer).not.toBe(defaults.controlRenderers[i]!.renderer);
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
      expect(body).toHaveClass('p-2');
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

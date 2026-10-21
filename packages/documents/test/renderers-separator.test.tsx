import { JsonForms } from '@jsonforms/react';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as defaults from '../src/renderers/default/index';
import * as studio from '../src/renderers/studio/index';
import * as ui from '../src/renderers/ui/index';
import { renderStudioRenderers } from './render-studio-renderers';

const separator = { id: 's1', type: 'Separator' };
const ctx = { rootSchema: {}, config: {} } as never;
const topRanks = (set: { tester: (...a: never[]) => number }[]) =>
  set.map((r) => r.tester(separator as never, {} as never, ctx)).toSorted((a, b) => b - a);

function renderUi(uischema: Record<string, unknown>) {
  return render(
    <JsonForms
      schema={{ type: 'object', properties: { x: { type: 'boolean' } } }}
      uischema={uischema as never}
      data={{}}
      renderers={ui.renderers}
      cells={ui.cells}
    />,
  );
}

describe('Separator (doc 240)', () => {
  it('ranks 1 in ui (and default), and the studio variant 2, never tied (rule 1)', () => {
    expect(topRanks(ui.renderers)[0]).toBe(1);
    expect(topRanks(defaults.renderers)[0]).toBe(1);
    const [top, next] = topRanks(studio.renderers);
    expect(top).toBe(2);
    expect(next).toBe(1);
  });

  it('draws a horizontal @repo/ui Separator, ignoring authored options (rule 2)', () => {
    const { container } = renderUi({
      ...separator,
      label: 'ignored',
      options: { spacing: 'lg' },
    });
    const element = container.querySelector('[data-slot="separator-element"]')!;
    const rule = element.querySelector('[data-slot="separator"]')!;
    expect(rule).toHaveAttribute('role', 'separator');
    expect(rule).toHaveAttribute('data-orientation', 'horizontal');
    expect(element).not.toHaveTextContent('ignored');
  });

  it('renders nothing when hidden (rule 3)', () => {
    const shown = renderUi(separator);
    expect(shown.container.querySelector('[data-slot="separator-element"]')).not.toBeNull();
    shown.unmount();
    const rule = { effect: 'HIDE', condition: { scope: '#/properties/x', schema: {} } };
    const { container } = renderUi({ ...separator, rule });
    expect(container.querySelector('[data-slot="separator-element"]')).toBeNull();
  });

  it('pads the studio Separator so it is a selectable row, wrapped and not inert (rule 4)', () => {
    const { container } = renderStudioRenderers({
      id: 'form',
      type: 'Form',
      elements: [separator],
    });
    const wrapper = container.querySelector<HTMLElement>('[data-element-id="s1"]')!;
    const element = wrapper.querySelector('[data-slot="separator-element"]')!;
    expect(element).toHaveClass('p-4');
    expect(wrapper.querySelector('[inert]')).toBeNull();
    fireEvent.click(element);
    expect(wrapper).toHaveAttribute('data-selected', '');
  });

  it('draws the ui Separator unpadded', () => {
    const { container } = renderUi(separator);
    expect(container.querySelector('[data-slot="separator-element"]')).not.toHaveClass('p-4');
  });
});

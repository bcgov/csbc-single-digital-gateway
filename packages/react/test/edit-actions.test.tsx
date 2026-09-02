import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EditActionProvider, type EditActionSection } from '../src/jsonforms-renderers';
import { renderers } from '../src/jsonforms-renderers';
import { displayRenderers } from '../src/jsonforms-renderers-display';
import { stampEditIds } from '../src/uischema-edit';

const schema: JsonSchema = {
  type: 'object',
  properties: { first_name: { type: 'string' } },
};

const child = { type: 'Control', scope: '#/properties/first_name', label: 'First name' };

const tree = (type: 'Group' | 'Section', options: unknown) =>
  stampEditIds({
    type: 'VerticalLayout',
    elements: [{ type, label: 'Providers', options, elements: [child] }],
  }) as unknown as UISchemaElement;

function renderTree(
  uischema: UISchemaElement,
  { actions, set = renderers }: { actions?: EditActionSection[]; set?: typeof renderers } = {},
) {
  const form = (
    <JsonForms schema={schema} uischema={uischema} data={{}} renderers={set} cells={[]} />
  );
  if (actions === undefined) {
    return render(form);
  }
  return render(
    <EditActionProvider
      value={{
        renderAction: (section) => {
          actions.push(section);
          return <button type="button">Edit {section.label}</button>;
        },
      }}
    >
      {form}
    </EditActionProvider>,
  );
}

describe.each(['Group', 'Section'] as const)('%s edit affordance', (type) => {
  it('renders no button when no provider is mounted', () => {
    renderTree(tree(type, { edit: true }));
    expect(screen.queryByRole('button', { name: /edit/i })).toBeNull();
    expect(screen.getByText('Providers')).toBeInTheDocument();
  });

  it('renders no button when the element is not marked editable', () => {
    const actions: EditActionSection[] = [];
    renderTree(tree(type, { description: 'plain' }), { actions });
    expect(screen.queryByRole('button', { name: /edit/i })).toBeNull();
    expect(actions).toEqual([]);
  });

  it('renders the injected affordance for a marked element', () => {
    const actions: EditActionSection[] = [];
    renderTree(tree(type, { edit: true }), { actions });
    expect(screen.getByRole('button', { name: 'Edit Providers' })).toBeInTheDocument();
    expect(actions).toEqual([
      { id: 'providers', label: 'Providers', editor: null, actionLabel: null },
    ]);
  });

  it('passes definition-authored affordance wording through', () => {
    const actions: EditActionSection[] = [];
    renderTree(tree(type, { edit: { actionLabel: 'Manage methods' } }), { actions });
    expect(actions[0]?.actionLabel).toBe('Manage methods');
    expect(screen.getByRole('button', { name: 'Edit Providers' })).toBeInTheDocument();
  });

  it('passes the registered editor key through', () => {
    const actions: EditActionSection[] = [];
    renderTree(tree(type, { edit: { editor: 'application-methods' } }), { actions });
    expect(actions[0]?.editor).toBe('application-methods');
  });

  it('honours an app that declines to render an affordance', () => {
    render(
      <EditActionProvider value={{ renderAction: () => null }}>
        <JsonForms
          schema={schema}
          uischema={tree(type, { edit: true })}
          data={{}}
          renderers={renderers}
          cells={[]}
        />
      </EditActionProvider>,
    );
    expect(screen.queryByRole('button', { name: /edit/i })).toBeNull();
  });

  it('renders nothing for an UNSTAMPED marker — a guessed id opens the wrong window', () => {
    const unstamped = {
      type: 'VerticalLayout',
      elements: [{ type, label: 'Providers', options: { edit: true }, elements: [child] }],
    } as unknown as UISchemaElement;
    const actions: EditActionSection[] = [];
    renderTree(unstamped, { actions });
    expect(actions).toEqual([]);
  });

  it('works in the display renderer set too — both registries share the layouts', () => {
    const actions: EditActionSection[] = [];
    renderTree(tree(type, { edit: true }), { actions, set: displayRenderers });
    expect(screen.getByRole('button', { name: 'Edit Providers' })).toBeInTheDocument();
  });
});

describe('Group edit affordance placement', () => {
  it('renders a header block for an editable group with no label', () => {
    const unlabelled = stampEditIds({
      type: 'VerticalLayout',
      elements: [{ type: 'Group', options: { edit: { id: 'only' } }, elements: [child] }],
    }) as unknown as UISchemaElement;
    renderTree(unlabelled, { actions: [] });
    expect(screen.getByRole('button', { name: /^Edit/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading')).toBeNull();
  });
});

describe('Section edit affordance placement', () => {
  it('keeps the legend a direct child of the fieldset', () => {
    const { container } = renderTree(tree('Section', { edit: true }), { actions: [] });
    const legend = container.querySelector('legend');
    expect(legend?.parentElement?.tagName).toBe('FIELDSET');
    expect(legend?.querySelector('button')).not.toBeNull();
  });
});

describe('provider isolation', () => {
  it('does not leak into a nested form rendered outside the provider', () => {
    const renderAction = vi.fn(() => <button type="button">Edit</button>);
    render(
      <>
        <EditActionProvider value={{ renderAction }}>
          <JsonForms
            schema={schema}
            uischema={tree('Group', { edit: true })}
            data={{}}
            renderers={renderers}
            cells={[]}
          />
        </EditActionProvider>
        <JsonForms
          schema={schema}
          uischema={tree('Group', { edit: true })}
          data={{}}
          renderers={renderers}
          cells={[]}
        />
      </>,
    );
    expect(renderAction).toHaveBeenCalledTimes(1);
  });
});

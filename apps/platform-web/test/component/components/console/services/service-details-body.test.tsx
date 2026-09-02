import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { EditActions } from '@repo/react/jsonforms-renderers';

const { actionsRef } = vi.hoisted(() => ({
  actionsRef: { current: null as EditActions | null },
}));

// Capture what the body injects into the port; the button's own rendering is covered in
// @repo/react's edit-actions test, so this asserts the app-owned half (draft gating + link target).
vi.mock('@repo/react/jsonforms-renderers', () => ({
  EditActionProvider: ({ value, children }: { value: EditActions; children: React.ReactNode }) => {
    actionsRef.current = value;
    return <>{children}</>;
  },
}));

vi.mock('@repo/react/jsonforms', () => ({
  JsonForms: ({ uischema }: { uischema: { elements?: Array<Record<string, unknown>> } }) => (
    <div data-testid="jsonforms">
      {(uischema.elements ?? []).map((element, index) => (
        <div key={index} data-testid="element" data-edit={JSON.stringify(element.options ?? {})} />
      ))}
    </div>
  ),
}));
vi.mock('@repo/react/jsonforms-renderers-display', () => ({ displayRenderers: [] }));
vi.mock('@tanstack/react-router', () => ({
  // Renders `children` so the affordance's own wording is assertable.
  Link: ({
    to,
    params,
    children,
  }: {
    to: string;
    params: Record<string, string>;
    children?: React.ReactNode;
  }) => (
    <a href={to} data-params={JSON.stringify(params)}>
      {children}
    </a>
  ),
}));

import { ServiceDetailsBody } from '@/components/console/services/service-details-body';

const UISCHEMA = {
  type: 'VerticalLayout',
  elements: [
    {
      type: 'Group',
      label: 'Service description',
      options: { edit: true },
      elements: [{ type: 'Control', scope: '#/properties/summary' }],
    },
    { type: 'Group', label: 'Plain', elements: [] },
  ],
};

function renderBody({ isDraft = true }: { isDraft?: boolean } = {}) {
  actionsRef.current = null;
  return render(
    <ServiceDetailsBody
      slug="riverton"
      serviceId="svc-1"
      versionId="ver-2"
      isDraft={isDraft}
      schema={{ type: 'object', properties: { summary: { type: 'string' } } }}
      uischema={UISCHEMA}
      data={{ summary: 'hi' }}
    />,
  );
}

describe('ServiceDetailsBody windowed editing', () => {
  it('stamps a resolved edit id onto the marked group before dispatching it', () => {
    renderBody();
    const stamped = screen
      .getAllByTestId('element')
      .map((node) => node.getAttribute('data-edit') ?? '');
    expect(stamped.some((o) => o.includes('"id":"service-description"'))).toBe(true);
  });

  it('mounts the edit port around the read-only surface', () => {
    renderBody();
    expect(actionsRef.current).not.toBeNull();
  });

  it('renders an affordance pointing at the section edit route on a draft', () => {
    renderBody({ isDraft: true });
    render(
      <>
        {actionsRef.current?.renderAction({
          id: 'service-description',
          label: 'Service description',
          editor: null,
          actionLabel: null,
        })}
      </>,
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute(
      'href',
      '/app/$slug/services/$id/versions/$versionId/details/edit/$sectionId/{-$stepId}',
    );
    expect(JSON.parse(link.getAttribute('data-params') ?? '{}')).toEqual({
      slug: 'riverton',
      id: 'svc-1',
      versionId: 'ver-2',
      sectionId: 'service-description',
    });
  });

  it('uses the definition-authored wording when the marker supplies one', () => {
    renderBody({ isDraft: true });
    render(
      <>
        {actionsRef.current?.renderAction({
          id: 'application-methods',
          label: 'Application methods',
          editor: 'application-methods',
          actionLabel: 'Manage methods',
        })}
      </>,
    );
    expect(screen.getByRole('link')).toHaveTextContent('Manage methods');
  });

  it('renders NO affordance when the viewed version is not a draft', () => {
    renderBody({ isDraft: false });
    expect(
      actionsRef.current?.renderAction({
        id: 'service-description',
        label: 'x',
        editor: null,
        actionLabel: null,
      }),
    ).toBeNull();
  });

  it('still renders the always-on console sections', () => {
    renderBody();
    expect(screen.getByRole('heading', { name: 'Configuration' })).toBeInTheDocument();
  });
});

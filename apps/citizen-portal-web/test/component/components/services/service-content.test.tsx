import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Breadcrumb, ServiceContent } from '@/components/services/service-content';

// Mock @tanstack/react-router Link component
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

// Mock JsonForms component from @repo/react/jsonforms
vi.mock('@repo/react/jsonforms', () => ({
  JsonForms: vi.fn(({ schema, uischema, data, renderers }: any) => (
    <div
      data-testid="json-forms"
      data-schema={JSON.stringify(schema)}
      data-uischema={JSON.stringify(uischema)}
      data-data={JSON.stringify(data)}
    >
      Renderers count: {renderers?.length || 0}
    </div>
  )),
}));

// Mock displayRenderers from @repo/react/jsonforms-renderers-display
vi.mock('@repo/react/jsonforms-renderers-display', () => ({
  displayRenderers: [{ tester: () => true, renderer: () => null }],
}));

describe('Breadcrumb Component', () => {
  it('renders nothing if trail is empty', () => {
    render(<Breadcrumb trail={[]} />);
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(nav).toBeInTheDocument();
    const items = screen.queryAllByRole('listitem');
    expect(items.length).toBe(0);
  });

  it('renders a mix of links and plain text breadcrumbs with separators in between', () => {
    const trail = [
      { label: 'Home', href: '/' },
      { label: 'Services', href: '/services' },
      { label: 'Detail' }, // last item, no href
    ];

    const { container } = render(<Breadcrumb trail={trail} />);

    const nav = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(nav).toBeInTheDocument();

    const links = screen.getAllByRole('link');
    expect(links.length).toBe(2);
    expect(links[0]).toHaveAttribute('href', '/');
    expect(links[0]).toHaveTextContent('Home');
    expect(links[1]).toHaveAttribute('href', '/services');
    expect(links[1]).toHaveTextContent('Services');

    const activeSpan = screen.getByText('Detail');
    expect(activeSpan).toBeInTheDocument();
    expect(activeSpan.tagName).toBe('SPAN');
    expect(activeSpan).toHaveAttribute('aria-current', 'page');

    // 3 items means we should have 2 separator icons between them (index > 0), each hidden from
    // the accessibility tree.
    const separators = container.querySelectorAll('svg[aria-hidden="true"]');
    expect(separators.length).toBe(2);
  });
});

describe('ServiceContent Component', () => {
  const mockSchema = {
    type: 'object',
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      age: { type: 'number' },
    },
  };

  const mockUiSchema = {
    type: 'VerticalLayout',
    elements: [
      { type: 'Control', scope: '#/properties/title' },
      { type: 'Control', scope: '#/properties/description' },
      { type: 'Control', scope: '#/properties/age' },
    ],
  };

  const mockData = {
    title: 'Test Service',
    description: 'This is a description',
    age: 18,
  };

  it('passes all elements through when omit list is empty', () => {
    render(<ServiceContent schema={mockSchema} uischema={mockUiSchema} data={mockData} />);

    const formsContainer = screen.getByTestId('json-forms');
    expect(formsContainer).toBeInTheDocument();

    const passedUiSchema = JSON.parse(formsContainer.getAttribute('data-uischema') || '{}');
    expect(passedUiSchema.elements.length).toBe(3);
    expect(passedUiSchema.elements[0].scope).toBe('#/properties/title');
    expect(passedUiSchema.elements[1].scope).toBe('#/properties/description');
    expect(passedUiSchema.elements[2].scope).toBe('#/properties/age');

    const passedSchema = JSON.parse(formsContainer.getAttribute('data-schema') || '{}');
    expect(passedSchema).toEqual(mockSchema);

    const passedData = JSON.parse(formsContainer.getAttribute('data-data') || '{}');
    expect(passedData).toEqual(mockData);

    expect(screen.getByText('Renderers count: 1')).toBeInTheDocument();
  });

  it('filters out specified elements using omit list', () => {
    render(
      <ServiceContent
        schema={mockSchema}
        uischema={mockUiSchema}
        data={mockData}
        omit={['title', 'description']}
      />,
    );

    const formsContainer = screen.getByTestId('json-forms');
    expect(formsContainer).toBeInTheDocument();

    const passedUiSchema = JSON.parse(formsContainer.getAttribute('data-uischema') || '{}');
    expect(passedUiSchema.elements.length).toBe(1);
    expect(passedUiSchema.elements[0].scope).toBe('#/properties/age');
  });

  it('handles empty uischema elements gracefully', () => {
    const emptyUiSchema = { type: 'VerticalLayout' };
    render(
      <ServiceContent
        schema={mockSchema}
        uischema={emptyUiSchema}
        data={mockData}
        omit={['title']}
      />,
    );

    const formsContainer = screen.getByTestId('json-forms');
    const passedUiSchema = JSON.parse(formsContainer.getAttribute('data-uischema') || '{}');
    expect(passedUiSchema.elements).toBeUndefined();
  });

  it('keeps elements without scope property when filtering', () => {
    const layoutUiSchema = {
      type: 'VerticalLayout',
      elements: [
        { type: 'Control', scope: '#/properties/title' },
        { type: 'VerticalLayout', elements: [] },
      ],
    };
    render(
      <ServiceContent
        schema={mockSchema}
        uischema={layoutUiSchema}
        data={mockData}
        omit={['title']}
      />,
    );

    const formsContainer = screen.getByTestId('json-forms');
    const passedUiSchema = JSON.parse(formsContainer.getAttribute('data-uischema') || '{}');
    expect(passedUiSchema.elements.length).toBe(1);
    expect(passedUiSchema.elements[0].type).toBe('VerticalLayout');
  });

  it('covers the fallback branch for empty pop', () => {
    const originalSplit = String.prototype.split;
    const originalPop = Array.prototype.pop;

    String.prototype.split = function (separator: any, limit?: number) {
      const result = originalSplit.call(this, separator, limit);
      (result as any).__isOmitControlsSplit = true;
      return result;
    };

    Array.prototype.pop = function () {
      if ((this as any).__isOmitControlsSplit) {
        return undefined;
      }
      return originalPop.apply(this, arguments as any);
    };

    try {
      const layoutUiSchema = {
        type: 'VerticalLayout',
        elements: [{ type: 'Control', scope: '#/properties/title' }],
      };
      render(
        <ServiceContent
          schema={mockSchema}
          uischema={layoutUiSchema}
          data={mockData}
          omit={['']}
        />,
      );
    } finally {
      String.prototype.split = originalSplit;
      Array.prototype.pop = originalPop;
    }
  });
});

/**
 * Feature 174. The Service type nests its fields inside top-level `Group`s, so an omitted control
 * is no longer necessarily a top-level element — `omitControls` recurses. A top-level-only filter
 * silently stopped omitting `contact_methods` and rendered it twice (once here, once in the
 * dedicated Contact section).
 */
const passedUiSchema = () =>
  JSON.parse(screen.getByTestId('json-forms').getAttribute('data-uischema') || '{}');

describe('ServiceContent — omit reaches nested controls (feature 174)', () => {
  const groupedUiSchema = {
    type: 'VerticalLayout',
    elements: [
      { type: 'Control', scope: '#/properties/title' },
      {
        type: 'Group',
        label: 'Service description',
        elements: [
          { type: 'Control', scope: '#/properties/service_description/properties/about' },
          {
            type: 'Control',
            scope: '#/properties/service_description/properties/contact_methods',
          },
        ],
      },
    ],
  };

  it('omits a contact_methods control nested inside a Group', () => {
    render(
      <ServiceContent
        schema={{ type: 'object' }}
        uischema={groupedUiSchema}
        data={{}}
        omit={['title', 'description', 'contact_methods']}
      />,
    );

    const ui = passedUiSchema();
    // The top-level title control is gone, the Group survives.
    expect(ui.elements).toHaveLength(1);
    expect(ui.elements[0].type).toBe('Group');
    // Inside the Group, only `about` remains.
    expect(ui.elements[0].elements).toHaveLength(1);
    expect(ui.elements[0].elements[0].scope).toBe(
      '#/properties/service_description/properties/about',
    );
  });

  it('still omits the same field at the flat legacy path', () => {
    render(
      <ServiceContent
        schema={{ type: 'object' }}
        uischema={{
          type: 'VerticalLayout',
          elements: [
            { type: 'Control', scope: '#/properties/contact_methods' },
            { type: 'Control', scope: '#/properties/about' },
          ],
        }}
        data={{}}
        omit={['contact_methods']}
      />,
    );

    const ui = passedUiSchema();
    expect(ui.elements).toHaveLength(1);
    expect(ui.elements[0].scope).toBe('#/properties/about');
  });

  it('leaves a Group untouched when nothing inside it is omitted', () => {
    render(
      <ServiceContent
        schema={{ type: 'object' }}
        uischema={groupedUiSchema}
        data={{}}
        omit={['nothing-matches']}
      />,
    );

    const ui = passedUiSchema();
    expect(ui.elements).toHaveLength(2);
    expect(ui.elements[1].elements).toHaveLength(2);
  });
});

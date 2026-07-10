import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Breadcrumb, ServiceContent } from '@/components/services/service-content';

// Mock Lucide Icons
vi.mock('lucide-react', () => ({
  ChevronRight: () => <span data-testid="chevron-right" />,
}));

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

  it('renders a mix of links and plain text breadcrumbs with chevrons in between', () => {
    const trail = [
      { label: 'Home', href: '/' },
      { label: 'Services', href: '/services' },
      { label: 'Detail' }, // last item, no href
    ];

    render(<Breadcrumb trail={trail} />);

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

    // 3 items means we should have 2 chevron icons separating them (since index > 0)
    const chevrons = screen.getAllByTestId('chevron-right');
    expect(chevrons.length).toBe(2);
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
});

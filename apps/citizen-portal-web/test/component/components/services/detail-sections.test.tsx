import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import {
  DETAIL_SECTIONS,
  OnThisPage,
  Section,
  InAGlance,
  EligibilityCriteria,
  HowToApply,
  YourActivity,
  HelpAndInformation,
  ServiceSections,
  readContactMethods,
} from '@/components/services/detail-sections';
import { ContactSection } from '@/components/services/contact-section';

// Mock UI elements from @repo
vi.mock('@repo/react/jsonforms-renderers-display', () => ({
  ContactMethodsView: ({ value }: any) => (
    <div data-testid="contact-methods-view">{JSON.stringify(value)}</div>
  ),
  normalizeContactMethods: (value: any) => (value ? [value] : []),
}));

vi.mock('@repo/ui/accordion', () => ({
  Accordion: ({ children }: any) => <div data-testid="accordion">{children}</div>,
  AccordionItem: ({ children, value }: any) => (
    <div data-testid={`accordion-item-${value}`}>{children}</div>
  ),
  AccordionTrigger: ({ children }: any) => (
    <button data-testid="accordion-trigger">{children}</button>
  ),
  AccordionContent: ({ children }: any) => <div data-testid="accordion-content">{children}</div>,
}));

vi.mock('@repo/ui/button', () => ({
  Button: ({ children, onClick, render: renderProp }: any) => {
    if (renderProp) {
      return React.cloneElement(renderProp, {
        children: (
          <>
            {renderProp.props.children}
            {children}
          </>
        ),
        onClick,
      });
    }
    return (
      <button data-testid="button" onClick={onClick}>
        {children}
      </button>
    );
  },
}));

vi.mock('@repo/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
}));

// Mock @tanstack/react-router Link component
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, ...props }: any) => {
    const href = to
      .replace('$serviceId', params?.serviceId || '')
      .replace('$formId', params?.formId || '');
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

// Mock @tanstack/react-query useQuery
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

// Mock child components
vi.mock('@/components/services/application-row', () => ({
  ApplicationRow: ({ application }: any) => (
    <div data-testid={`application-row-${application.id}`}>{application.formTitle}</div>
  ),
}));

vi.mock('@/components/services/service-content', () => ({
  ServiceContent: ({ schema, uischema, data }: any) => (
    <div data-testid="service-content">{JSON.stringify({ schema, uischema, data })}</div>
  ),
}));

vi.mock('@/lib/catalog', () => ({
  myApplicationsQueryOptions: vi.fn(() => ({ queryKey: ['myApplications'] })),
}));

describe('OnThisPage Component', () => {
  it('renders a navigation element with the correct links', () => {
    render(<OnThisPage />);
    const nav = screen.getByRole('navigation', { name: /on this page/i });
    expect(nav).toBeInTheDocument();

    DETAIL_SECTIONS.forEach((section) => {
      const link = screen.getByRole('link', { name: section.label });
      expect(link).toHaveAttribute('href', `#${section.id}`);
    });
  });
});

describe('Section Component', () => {
  it('renders a section with a heading and children', () => {
    render(
      <Section id="test-sec" title="Test Section Title">
        <p>Test Child Content</p>
      </Section>,
    );
    const heading = screen.getByRole('heading', { name: /Test Section Title/i, level: 2 });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText('Test Child Content')).toBeInTheDocument();
  });
});

describe('InAGlance Component', () => {
  it('renders the overview info cards', () => {
    render(<InAGlance />);
    expect(screen.getByText('Cost')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Processing time')).toBeInTheDocument();
    expect(screen.getByText('2–4 weeks')).toBeInTheDocument();
    expect(screen.getByText('How to apply')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
  });
});

describe('EligibilityCriteria Component', () => {
  it('renders eligibility accordion with age, income, and residency', () => {
    render(<EligibilityCriteria />);
    expect(screen.getByText('Age')).toBeInTheDocument();
    expect(screen.getByText('Income')).toBeInTheDocument();
    expect(screen.getByText('Residency')).toBeInTheDocument();
  });
});

describe('HowToApply Component', () => {
  it('renders fallback copy when there are no applications', () => {
    render(<HowToApply serviceId="svc-1" applications={[]} />);
    expect(
      screen.getByText(/This service isn’t available to apply for online yet/i),
    ).toBeInTheDocument();
  });

  it('renders application buttons with custom or default labels', () => {
    const apps = [
      { id: '1', label: 'Apply Now', title: 'Income Assistance', formId: 'f-1' },
      { id: '2', label: null, title: 'Disability Assistance', formId: 'f-2' },
      { id: '3', label: 'Untitled', title: 'Child Assistance', formId: 'f-3' },
    ];
    render(<HowToApply serviceId="svc-1" applications={apps} />);

    expect(screen.getByText('Income Assistance')).toBeInTheDocument();
    expect(screen.getByText('Disability Assistance')).toBeInTheDocument();
    expect(screen.getByText('Child Assistance')).toBeInTheDocument();

    const link1 = screen.getByRole('link', { name: 'Apply Now' });
    expect(link1).toHaveAttribute('href', '/services/svc-1/apply/f-1');

    // Muted/Untitled labels fall back to default text
    const link2 = screen.getAllByRole('link', { name: 'Start an application' });
    expect(link2).toHaveLength(2);
    expect(link2[0]).toHaveAttribute('href', '/services/svc-1/apply/f-2');
    expect(link2[1]).toHaveAttribute('href', '/services/svc-1/apply/f-3');
  });

  it('renders external applications correctly and handles falsy external URLs', () => {
    let accessCount = 0;
    const apps = [
      {
        id: 'ext-1',
        kind: 'external-application',
        url: 'https://external-site.com',
        title: 'External Service',
        formId: 'f-ext-1',
      },
      {
        id: 'ext-empty',
        kind: 'external-application',
        url: '', // Falsy URL should fall back to internal application
        title: 'Empty URL External Service',
        formId: 'f-ext-empty',
      },
      {
        id: 'ext-dynamic',
        kind: 'external-application',
        get url() {
          accessCount++;
          if (accessCount === 1) {
            return 'https://example.com';
          }
          return undefined;
        },
        title: 'Dynamic URL External Service',
        formId: 'f-ext-dynamic',
      },
    ] as any[];

    render(<HowToApply serviceId="svc-1" applications={apps} />);

    // External service checks
    expect(screen.getByText('External Service')).toBeInTheDocument();
    expect(screen.getAllByText('Apply on an external site.')).toHaveLength(2);
    const externalLinks = screen.getAllByText('Visit site');
    expect(externalLinks).toHaveLength(2);
    expect(externalLinks[0]).toHaveAttribute('href', 'https://external-site.com');
    expect(externalLinks[0]).toHaveAttribute('target', '_blank');
    expect(externalLinks[1]).not.toHaveAttribute('href');
    expect(externalLinks[1]).toHaveAttribute('target', '_blank');

    // Falsy URL checks (falls back to internal)
    expect(screen.getByText('Empty URL External Service')).toBeInTheDocument();
    expect(screen.getByText('Apply through the Single Digital Gateway.')).toBeInTheDocument();
    const internalLink = screen.getByRole('link', { name: 'Start an application' });
    expect(internalLink).toHaveAttribute('href', '/services/svc-1/apply/f-ext-empty');
  });
});

describe('YourActivity Component', () => {
  it('renders fallback when the user has no activity for the service or data is undefined', () => {
    vi.mocked(useQuery).mockReturnValue({ data: undefined } as any);
    render(<YourActivity serviceId="svc-1" />);
    expect(screen.getByText('No applications yet')).toBeInTheDocument();
  });

  it('renders application rows when the user has applications for this service', () => {
    const mockApps = [
      { id: 'app-1', serviceId: 'svc-1', formTitle: 'Form 1' },
      { id: 'app-2', serviceId: 'svc-2', formTitle: 'Form 2' },
    ];
    vi.mocked(useQuery).mockReturnValue({ data: mockApps } as any);
    render(<YourActivity serviceId="svc-1" />);

    // Only app-1 is for svc-1
    expect(screen.getByTestId('application-row-app-1')).toBeInTheDocument();
    expect(screen.queryByTestId('application-row-app-2')).not.toBeInTheDocument();
    expect(screen.getByText('Form 1')).toBeInTheDocument();
  });
});

describe('HelpAndInformation Component', () => {
  it('renders help sections', () => {
    render(<HelpAndInformation />);
    expect(screen.getByText('Guides and resources')).toBeInTheDocument();
    expect(screen.getByText('Policy and legislation')).toBeInTheDocument();
  });
});

describe('ContactSection Component', () => {
  it('renders empty state when there are no contact methods', () => {
    render(<ContactSection value={undefined} />);
    expect(screen.getByText('No contact information for this service yet.')).toBeInTheDocument();
  });

  it('renders ContactMethodsView when contact methods exist', () => {
    const mockValue = { type: 'phone', value: '1-800-000-0000' };
    render(<ContactSection value={mockValue} />);
    expect(screen.getByTestId('contact-methods-view')).toBeInTheDocument();
    expect(screen.getByText(JSON.stringify(mockValue))).toBeInTheDocument();
  });
});

describe('ServiceSections Component', () => {
  it('renders all sections and subsections', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [] } as any);

    const mockSchema = { type: 'object' };
    const mockUischema = { type: 'VerticalLayout' };
    const mockData = { name: 'test' };
    const mockApps = [{ id: '1', label: 'Apply', title: 'Form', formId: 'f-1' }];

    render(
      <ServiceSections
        serviceId="svc-1"
        schema={mockSchema}
        uischema={mockUischema}
        data={mockData}
        applications={mockApps}
      />,
    );

    // Check main layout structure
    expect(screen.getByRole('navigation', { name: /on this page/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Eligibility criteria' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'How to apply' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your activity' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Help and information' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Contact information' })).toBeInTheDocument();

    // Check service content is rendered with passed schemas
    const content = screen.getByTestId('service-content');
    expect(content).toBeInTheDocument();
    expect(content.textContent).toContain(JSON.stringify(mockSchema));
  });
});

/**
 * Feature 174 ripple. The reshaped Service type nests contact methods at
 * `data.service_description.contact_methods`; services authored against the OLD type version keep
 * them flat at `data.contact_methods`. The Contact section must read either.
 */
describe('readContactMethods — contact methods path tolerance (feature 174)', () => {
  const methods = [{ type: 'email', value: 'help@riverton.gov' }];

  it('should read contact methods from the flat legacy path', () => {
    expect(readContactMethods({ contact_methods: methods })).toEqual(methods);
  });

  it('should read contact methods from the nested service_description path', () => {
    expect(readContactMethods({ service_description: { contact_methods: methods } })).toEqual(
      methods,
    );
  });

  it('should prefer the nested path when both are present', () => {
    const nested = [{ type: 'phone', value: '250-555-0100' }];
    expect(
      readContactMethods({
        contact_methods: methods,
        service_description: { contact_methods: nested },
      }),
    ).toEqual(nested);
  });

  it('should fall back to the flat path when the group exists without the key', () => {
    expect(readContactMethods({ contact_methods: methods, service_description: {} })).toEqual(
      methods,
    );
  });

  it('should return undefined when neither path has a value', () => {
    expect(readContactMethods({})).toBeUndefined();
    expect(readContactMethods({ service_description: null })).toBeUndefined();
  });
});

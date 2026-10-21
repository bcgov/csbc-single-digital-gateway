import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ServiceSections, citizenUischema } from '@/components/services/detail-sections';

const schema = {
  type: 'object',
  properties: {
    about: { type: 'string', title: 'About' },
    hours: { type: 'string', title: 'Hours' },
    secret: { type: 'string', title: 'Staff notes' },
  },
};

const citizen = {
  type: 'Form',
  label: 'Service (Citizen)',
  options: { displayOnly: true, description: 'Shown in the page header instead' },
  elements: [
    {
      id: 'a',
      type: 'Section',
      label: 'Overview',
      elements: [{ type: 'Control', scope: '#/properties/about' }],
    },
    { id: 'b', type: 'Section', label: 'Eligibility criteria', elements: [] },
    {
      id: 'c',
      type: 'Section',
      label: 'Office hours',
      elements: [{ type: 'Control', scope: '#/properties/hours' }],
    },
  ],
};

const variants = {
  default: {
    type: 'Form',
    elements: [
      {
        id: 'd',
        type: 'Section',
        label: 'Internal',
        elements: [{ type: 'Control', scope: '#/properties/secret' }],
      },
    ],
  },
  Citizen: citizen,
};

const data = { about: 'Help with moving house.', hours: '9 to 5', secret: 'do not show' };

describe('citizenUischema', () => {
  it('picks the citizen variant case-insensitively, without the root title or description', () => {
    expect(citizenUischema(variants)).toEqual({
      type: 'Form',
      options: { displayOnly: true },
      elements: citizen.elements,
    });
  });

  it('falls back to the default variant', () => {
    expect(citizenUischema({ default: variants.default })).toEqual(variants.default);
  });
});

describe('ServiceSections', () => {
  it('renders the citizen variant, not the default one', () => {
    render(<ServiceSections schema={schema} variants={variants} data={data} />);
    expect(screen.getByText('Help with moving house.')).toBeInTheDocument();
    expect(screen.queryByText('do not show')).toBeNull();
    // The page header owns the title.
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });

  it('builds "On this page" from the Sections shown, linking to their anchors', () => {
    render(<ServiceSections schema={schema} variants={variants} data={data} />);
    const nav = screen.getByRole('navigation', { name: 'On this page' });
    const links = within(nav).getAllByRole('link');
    // The empty "Eligibility criteria" Section is hidden, so it has no entry either.
    expect(
      links.map((link) => [link.getAttribute('aria-label'), link.getAttribute('href')]),
    ).toEqual([
      ['Overview', '#overview'],
      ['Office hours', '#office-hours'],
    ]);
    for (const link of links) {
      const target = document.getElementById(link.getAttribute('href')!.slice(1));
      expect(target).toHaveAttribute('data-slot', 'section');
    }
    expect(screen.queryByRole('heading', { name: 'Eligibility criteria' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Office hours', level: 2 })).toBeInTheDocument();
  });

  it('shows no rail when the variant has no titled Sections', () => {
    render(
      <ServiceSections
        schema={schema}
        variants={{
          default: { type: 'Form', elements: [{ type: 'Control', scope: '#/properties/about' }] },
        }}
        data={data}
      />,
    );
    expect(screen.queryByRole('navigation', { name: 'On this page' })).toBeNull();
    expect(screen.getByText('Help with moving house.')).toBeInTheDocument();
  });
});

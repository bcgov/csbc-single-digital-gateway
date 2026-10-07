import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DocumentView } from '../src/view';
import { condition, control, edge, form, funnel, row } from './funnel-fixtures';
import { richText } from './rich-text-fixtures';

// Doc 282: a document's schema, uischema and answers read back as plain text.

const SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Name', description: 'As on your ID' },
    notes: { type: 'string', title: 'Notes' },
    age: { type: 'integer', title: 'Age' },
    resident: { type: 'boolean', title: 'BC resident' },
    region: {
      type: 'string',
      title: 'Region',
      oneOf: [
        { const: 'n', title: 'North' },
        { const: 'i', title: 'Interior' },
      ],
    },
    fruit: {
      type: 'array',
      title: 'Fruit',
      items: {
        type: 'string',
        oneOf: [
          { const: 'a', title: 'Apple' },
          { const: 'b', title: 'Banana' },
        ],
      },
    },
    bio: { type: 'object', title: 'Bio', required: ['root'] },
    secret: { type: 'string', title: 'Secret' },
    people: {
      type: 'array',
      title: 'People',
      items: { type: 'object', properties: { first: { type: 'string', title: 'First' } } },
    },
    family: {
      type: 'array',
      title: 'Family',
      items: { type: 'object', properties: { given: { type: 'string', title: 'Given' } } },
    },
    faq: {
      type: 'array',
      title: 'Questions',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', title: 'Question' },
          content: { type: 'object', title: 'Answer', required: ['root'] },
        },
      },
    },
  },
};
const ITEM = '#/properties/family/items/properties';
const FORM = {
  type: 'Form',
  label: 'Permit',
  elements: [
    { type: 'Control', scope: '#/properties/name' },
    { type: 'Control', scope: '#/properties/notes', options: { component: 'textarea' } },
    { type: 'Control', scope: '#/properties/age' },
    { type: 'Control', scope: '#/properties/resident' },
    { type: 'Control', scope: '#/properties/region' },
    { type: 'Control', scope: '#/properties/fruit' },
    { type: 'Control', scope: '#/properties/bio' },
    {
      type: 'Control',
      scope: '#/properties/secret',
      rule: {
        effect: 'HIDE',
        condition: { scope: '#/properties/resident', schema: { const: true } },
      },
    },
    { type: 'Control', scope: '#/properties/people' },
    {
      type: 'Control',
      scope: '#/properties/family',
      options: { component: 'record' },
      elements: [
        { type: 'VerticalLayout', elements: [{ type: 'Control', scope: `${ITEM}/given` }] },
      ],
    },
    { type: 'Control', scope: '#/properties/faq', options: { component: 'accordion' } },
  ],
};
const ANSWERS = {
  name: 'Ada',
  notes: 'line one\nline two',
  age: 42,
  resident: true,
  region: 'i',
  fruit: ['b', 'a'],
  bio: richText('Retired teacher'),
  secret: 'hidden',
  people: [{ first: 'Bea' }],
  family: [{ given: 'Cy' }, { given: 'Di' }],
  faq: [{ title: 'Who?', content: richText('Anyone') }],
};

const fieldNamed = (label: string) =>
  [...document.querySelectorAll<HTMLElement>('[data-slot="plain-field"]')].find(
    (field) =>
      within(field).queryByText(label, { selector: '[data-slot="plain-field-label"]' }) !== null,
  );
const valueOf = (label: string) =>
  fieldNamed(label)?.querySelector<HTMLElement>('[data-slot="plain-field-value"]');

describe('DocumentView — a Form (doc 282 rules 1-7)', () => {
  it('reads every answer back as plain text, with no inputs and no action bar', () => {
    render(<DocumentView schema={SCHEMA} uischema={FORM} data={ANSWERS} />);
    expect(document.querySelector('[data-slot="document-view"]')).not.toBeNull();
    expect(valueOf('Name')).toHaveTextContent('Ada');
    expect(valueOf('Notes')?.textContent).toBe('line one\nline two');
    expect(valueOf('Age')).toHaveTextContent('42');
    expect(valueOf('BC resident')).toHaveTextContent('Yes');
    expect(valueOf('Region')).toHaveTextContent('Interior');
    expect(
      [...(valueOf('Fruit')?.querySelectorAll('li') ?? [])].map((li) => li.textContent),
    ).toEqual(['Apple', 'Banana']);
    expect(valueOf('Bio')).toHaveTextContent('Retired teacher');
    // A plain field's label is not a form label (rule 5) — object arrays keep their shell, which names its table —
    // and nothing can be filled or submitted.
    expect(document.querySelector('[data-slot="plain-field"] label')).toBeNull();
    // The only "textbox" is RichTextView's read-only surface (aria-readonly) — nothing can be typed into.
    expect(
      screen
        .queryAllByRole('textbox')
        .filter((box) => box.getAttribute('aria-readonly') !== 'true'),
    ).toEqual([]);
    expect(screen.queryByRole('button', { name: /submit|save draft/i })).toBeNull();
  });

  it('shows the description under the answer', () => {
    render(<DocumentView schema={SCHEMA} uischema={FORM} data={ANSWERS} />);
    expect(fieldNamed('Name')).toHaveTextContent('As on your ID');
  });

  it('says "Not answered" for every empty field, still showing it', () => {
    render(<DocumentView schema={SCHEMA} uischema={FORM} data={{}} />);
    for (const label of ['Name', 'Age', 'BC resident', 'Region', 'Fruit', 'Bio']) {
      expect(valueOf(label)).toHaveTextContent('Not answered');
      expect(valueOf(label)).toHaveAttribute('data-empty');
    }
  });

  it('applies rules: a field a rule hides renders nothing', () => {
    render(<DocumentView schema={SCHEMA} uischema={FORM} data={ANSWERS} />);
    expect(fieldNamed('Secret')).toBeUndefined();
  });

  it('refuses a root that is not a Form or a Funnel', () => {
    render(
      <DocumentView
        schema={SCHEMA}
        uischema={{ type: 'VerticalLayout', elements: [] }}
        data={{}}
      />,
    );
    expect(screen.getByRole('alert')).toHaveAttribute('data-slot', 'document-view-root-error');
  });
});

describe('DocumentView — complex fields (doc 282 rules 8-11)', () => {
  it('reads a data table as a read-only table of its rows', () => {
    render(<DocumentView schema={SCHEMA} uischema={FORM} data={ANSWERS} />);
    const table = screen.getByRole('table', { name: 'People' });
    expect(within(table).getByText('Bea')).toBeInTheDocument();
    expect(within(table).queryByRole('textbox')).toBeNull();
  });

  it('reads a record as labelled items of plain fields', () => {
    render(<DocumentView schema={SCHEMA} uischema={FORM} data={ANSWERS} />);
    const second = screen.getByRole('group', { name: 'Item 2' });
    expect(within(second).getByText('Di')).toBeInTheDocument();
    expect(second.querySelector('[data-slot="plain-field"]')).not.toBeNull();
  });

  it('reads an accordion input as a collapsed Accordion group', () => {
    render(<DocumentView schema={SCHEMA} uischema={FORM} data={ANSWERS} />);
    expect(screen.getByRole('button', { name: 'Who?' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('says "Not answered" for an empty table, record and accordion', () => {
    render(<DocumentView schema={SCHEMA} uischema={FORM} data={{}} />);
    for (const label of ['People', 'Family', 'Questions']) {
      const field = [...document.querySelectorAll('[data-slot="data-table-field"]')].find((f) =>
        f.textContent?.startsWith(label),
      );
      expect(field).toHaveTextContent('Not answered');
    }
    expect(screen.queryByRole('group', { name: 'Item 1' })).toBeNull();
  });

  it('lists every tab under its title, nothing hidden behind a tab', () => {
    const tabs = {
      type: 'Form',
      elements: [
        {
          type: 'Tabs',
          elements: [
            {
              type: 'VerticalLayout',
              label: 'About you',
              elements: [{ type: 'Control', scope: '#/properties/name' }],
            },
            {
              type: 'VerticalLayout',
              label: 'Where',
              elements: [{ type: 'Control', scope: '#/properties/region' }],
            },
          ],
        },
      ],
    };
    render(<DocumentView schema={SCHEMA} uischema={tabs} data={ANSWERS} />);
    const listed = [...document.querySelectorAll('[data-slot="plain-tab"]')];
    expect(listed.map((tab) => tab.querySelector('h2,h3,h4')?.textContent)).toEqual([
      'About you',
      'Where',
    ]);
    expect(screen.queryByRole('tab')).toBeNull();
    expect(valueOf('Region')).toHaveTextContent('Interior');
  });
});

const titles = () =>
  [...document.querySelectorAll('[data-slot="form-title"]')].map((t) => t.textContent);

describe('DocumentView — a Funnel (doc 282 rules 12-13)', () => {
  const FUNNEL_SCHEMA = {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Name' },
      biz: { type: 'boolean', title: 'Applying as a business' },
      company: { type: 'string', title: 'Company' },
      nickname: { type: 'string', title: 'Nickname' },
    },
  };
  const FUNNEL = funnel(
    [
      form('a', 'Applicant', [control('name'), control('biz')]),
      form('b', 'Business', [control('company')]),
      form('p', 'Person', [control('nickname')]),
    ],
    [edge('e1', 'a', 'c'), edge('e2', 'c', 'b', 'r1'), edge('e3', 'c', 'p')],
    [condition('c', [row('r1', 'Business', [{ id: 'k1', field: 'biz', operator: 'isTrue' }])])],
  );

  it('stacks the Forms on the answered path on one page, with no rail or action bar', () => {
    render(
      <DocumentView
        schema={FUNNEL_SCHEMA}
        uischema={FUNNEL}
        data={{ name: 'Ada', biz: true, company: 'Acme' }}
      />,
    );
    expect(titles()).toEqual(['Applicant', 'Business']);
    expect(valueOf('Company')).toHaveTextContent('Acme');
    expect(screen.queryByRole('navigation', { name: 'Steps' })).toBeNull();
    expect(screen.queryByRole('button', { name: /next|submit/i })).toBeNull();
  });

  it('follows the other branch for other answers', () => {
    render(<DocumentView schema={FUNNEL_SCHEMA} uischema={FUNNEL} data={{ biz: false }} />);
    expect(titles()).toEqual(['Applicant', 'Person']);
  });
});

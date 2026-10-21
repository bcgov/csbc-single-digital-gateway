import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DocumentView } from '../src/view';
import { condition, control, edge, form, funnel, row } from './funnel-fixtures';

// Doc 283: `unanswered` — a service hides what nobody answered; a submission shows it.

const SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Name' },
    age: { type: 'integer', title: 'Age' },
    biz: { type: 'boolean', title: 'Business' },
    company: { type: 'string', title: 'Company' },
    nickname: { type: 'string', title: 'Nickname' },
  },
};
const FORM = {
  type: 'Form',
  label: 'Permit',
  elements: [
    {
      type: 'Section',
      label: 'About you',
      elements: [
        { type: 'Heading', options: { text: 'Who you are' } },
        { type: 'Control', scope: '#/properties/name' },
        { type: 'Control', scope: '#/properties/age' },
      ],
    },
    {
      type: 'Section',
      label: 'Your business',
      elements: [
        { type: 'Heading', options: { text: 'Company details' } },
        { type: 'Control', scope: '#/properties/company' },
      ],
    },
  ],
};
const labels = () =>
  [...document.querySelectorAll('[data-slot="plain-field-label"]')].map((l) => l.textContent);

describe('DocumentView unanswered (doc 283)', () => {
  it('shows every field by default — doc 282 unchanged', () => {
    render(<DocumentView schema={SCHEMA} uischema={FORM} data={{ name: 'Ada' }} />);
    expect(labels()).toEqual(['Name', 'Age', 'Company']);
    expect(screen.getAllByText('Not answered')).toHaveLength(2);
  });

  it("'hide' drops unanswered fields and a section left empty, heading and all", () => {
    render(
      <DocumentView schema={SCHEMA} uischema={FORM} data={{ name: 'Ada' }} unanswered="hide" />,
    );
    expect(labels()).toEqual(['Name']);
    expect(screen.queryByText('Not answered')).toBeNull();
    expect(screen.getByText('Who you are')).toBeInTheDocument();
    expect(screen.queryByText('Your business')).toBeNull();
    expect(screen.queryByText('Company details')).toBeNull();
  });

  it("'hide' with nothing answered says so instead of an empty page", () => {
    render(<DocumentView schema={SCHEMA} uischema={FORM} data={{}} unanswered="hide" />);
    expect(document.querySelector('[data-slot="document-view-empty"]')).toHaveTextContent(
      'Nothing has been answered yet.',
    );
    expect(labels()).toEqual([]);
  });

  it("'hide' prunes each Form on a Funnel's answered path, dropping one left empty", () => {
    const FUNNEL = funnel(
      [
        form('a', 'Applicant', [control('name'), control('biz')]),
        form('b', 'Business', [control('company')]),
        form('p', 'Person', [control('nickname')]),
      ],
      [edge('e1', 'a', 'c'), edge('e2', 'c', 'b', 'r1'), edge('e3', 'c', 'p')],
      [condition('c', [row('r1', 'Business', [{ id: 'k1', field: 'biz', operator: 'isTrue' }])])],
    );
    render(
      <DocumentView
        schema={SCHEMA}
        uischema={FUNNEL}
        data={{ name: 'Ada', biz: true }}
        unanswered="hide"
      />,
    );
    const titles = [...document.querySelectorAll('[data-slot="form-title"]')].map(
      (t) => t.textContent,
    );
    // On the path: Applicant (answered) and Business (nothing answered — dropped).
    expect(titles).toEqual(['Applicant']);
    expect(labels()).toEqual(['Name', 'Business']);
  });
});

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DocumentView, viewSections } from '../src/view';

// The outermost Sections a view shows, for a host's "On this page" nav, and the anchors the view puts on them.

const SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Name' },
    company: { type: 'string', title: 'Company' },
  },
};
const FORM = {
  type: 'Form',
  label: 'Permit',
  elements: [
    {
      id: 's1',
      type: 'Section',
      label: 'About you',
      elements: [
        { type: 'Control', scope: '#/properties/name' },
        {
          id: 's1a',
          type: 'Section',
          label: 'Nested',
          elements: [{ type: 'Control', scope: '#/properties/name' }],
        },
      ],
    },
    {
      type: 'VerticalLayout',
      elements: [
        {
          id: 's2',
          type: 'Section',
          label: 'Your business',
          elements: [{ type: 'Control', scope: '#/properties/company' }],
        },
      ],
    },
    {
      id: 's3',
      type: 'Section',
      label: 'About you!',
      elements: [{ type: 'Control', scope: '#/properties/name' }],
    },
    { id: 's4', type: 'Section', label: '  ', elements: [] },
    { type: 'Section', label: 'No id', elements: [] },
  ],
};
const ALL = { name: 'Ada', company: 'Acme' };

describe('viewSections', () => {
  it('lists the outermost titled Sections in reading order, with unique slug anchors', () => {
    expect(viewSections({ schema: SCHEMA, uischema: FORM, data: ALL })).toEqual([
      { anchor: 'about-you', label: 'About you', elementId: 's1' },
      { anchor: 'your-business', label: 'Your business', elementId: 's2' },
      { anchor: 'about-you-2', label: 'About you!', elementId: 's3' },
    ]);
  });

  it('with unanswered hidden, drops the Sections left without an answer', () => {
    expect(
      viewSections({ schema: SCHEMA, uischema: FORM, data: { name: 'Ada' }, unanswered: 'hide' }),
    ).toEqual([
      { anchor: 'about-you', label: 'About you', elementId: 's1' },
      { anchor: 'about-you-2', label: 'About you!', elementId: 's3' },
    ]);
  });

  it('lists nothing for a root that is not a Form', () => {
    expect(viewSections({ schema: SCHEMA, uischema: { type: 'Funnel' }, data: {} })).toEqual([]);
  });
});

const ids = () =>
  [...document.querySelectorAll('[data-slot="section"]')].map((el) => el.getAttribute('id'));

describe('DocumentView anchorSections', () => {
  it('puts each listed anchor on its Section, and no id on the rest', () => {
    render(<DocumentView schema={SCHEMA} uischema={FORM} data={ALL} anchorSections />);
    // About you, Nested, Your business, About you!, the blank-titled and the id-less Sections.
    expect(ids()).toEqual(['about-you', null, 'your-business', 'about-you-2', null, null]);
  });

  it('anchors nothing unless asked', () => {
    render(<DocumentView schema={SCHEMA} uischema={FORM} data={ALL} />);
    expect(ids().every((id) => id === null)).toBe(true);
  });

  it('anchors the same Sections it lists when unanswered are hidden', () => {
    render(
      <DocumentView
        schema={SCHEMA}
        uischema={FORM}
        data={{ name: 'Ada' }}
        unanswered="hide"
        anchorSections
      />,
    );
    expect(ids()).toEqual(['about-you', null, 'about-you-2']);
  });
});

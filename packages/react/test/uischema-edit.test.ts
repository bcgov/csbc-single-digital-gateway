import { describe, expect, it } from 'vitest';
import {
  collectEditableSections,
  collectScopes,
  findEditableSection,
  readEditOption,
  scopePath,
  scopedSchema,
  slugify,
  stampEditIds,
} from '../src/uischema-edit';

const group = (label: string, options: unknown, elements: unknown[] = []) => ({
  type: 'Group',
  label,
  options,
  elements,
});

const control = (scope: string) => ({ type: 'Control', scope });

describe('readEditOption', () => {
  it('reads the `true` shorthand as subtree mode', () => {
    expect(readEditOption({ edit: true })).toEqual({
      editor: null,
      id: null,
      actionLabel: null,
    });
  });

  it('reads an editor key and an authored id', () => {
    expect(readEditOption({ edit: { editor: 'application-methods', id: 'methods' } })).toEqual({
      editor: 'application-methods',
      id: 'methods',
      actionLabel: null,
    });
  });

  it('reads authored wording for the affordance', () => {
    expect(readEditOption({ edit: { actionLabel: 'Manage methods' } })?.actionLabel).toBe(
      'Manage methods',
    );
  });

  it('treats an empty object as subtree mode', () => {
    expect(readEditOption({ edit: {} })).toEqual({ editor: null, id: null, actionLabel: null });
  });

  it.each([
    ['no options', undefined],
    ['no edit key', { description: 'hi' }],
    ['edit: false', { edit: false }],
    ['a string', { edit: 'yes' }],
    ['an array', { edit: ['yes'] }],
    ['null', { edit: null }],
  ])('is not editable for %s', (_name, options) => {
    expect(readEditOption(options)).toBeNull();
  });

  it('ignores non-string editor/id values rather than throwing', () => {
    expect(readEditOption({ edit: { editor: 7, id: {}, actionLabel: [] } })).toEqual({
      editor: null,
      id: null,
      actionLabel: null,
    });
  });
});

describe('collectEditableSections', () => {
  const uischema = {
    type: 'VerticalLayout',
    elements: [
      group('Service description', { edit: true }, [
        {
          type: 'Categorization',
          elements: [
            {
              type: 'Category',
              label: 'Overview',
              elements: [
                {
                  type: 'VerticalLayout',
                  elements: [group('Providers', { edit: true }, [control('#/properties/who')])],
                },
              ],
            },
          ],
        },
      ]),
      group('Application methods', { edit: { editor: 'application-methods' } }),
      group('Not editable', { description: 'plain' }),
    ],
  };

  it('finds editable elements at any depth, in document order', () => {
    expect(collectEditableSections(uischema).map((s) => s.id)).toEqual([
      'service-description',
      'providers',
      'application-methods',
    ]);
  });

  it('carries the editor key, defaulting to null for subtree mode', () => {
    const sections = collectEditableSections(uischema);
    expect(sections[0]?.editor).toBeNull();
    expect(sections[2]?.editor).toBe('application-methods');
  });

  it('suffixes a repeated label so ids stay unique', () => {
    const repeated = {
      elements: [group('Contact', { edit: true }), group('Contact', { edit: true })],
    };
    expect(collectEditableSections(repeated).map((s) => s.id)).toEqual(['contact', 'contact-2']);
  });

  it('falls back to a positional id when a label slugifies to nothing', () => {
    const unlabelled = { elements: [group('', { edit: true }), group('!!!', { edit: true })] };
    expect(collectEditableSections(unlabelled).map((s) => s.id)).toEqual(['edit-1', 'edit-2']);
  });

  it('prefers an authored id over the label', () => {
    const authored = { elements: [group('Data & Privacy', { edit: { id: 'privacy' } })] };
    expect(collectEditableSections(authored)[0]?.id).toBe('privacy');
  });

  it('ignores an editable root — only descendants are sections', () => {
    expect(collectEditableSections({ type: 'Group', options: { edit: true } })).toEqual([]);
  });

  it('returns nothing for a uischema with no elements', () => {
    expect(collectEditableSections(undefined)).toEqual([]);
    expect(collectEditableSections({ type: 'Control', scope: '#/properties/a' })).toEqual([]);
  });

  it('findEditableSection resolves the same ids', () => {
    expect(findEditableSection(uischema, 'providers')?.label).toBe('Providers');
    expect(findEditableSection(uischema, 'nope')).toBeUndefined();
  });
});

describe('stampEditIds', () => {
  const uischema = {
    type: 'VerticalLayout',
    elements: [
      group('Service description', { description: 'keep me', edit: true }),
      group('Plain', { description: 'untouched' }),
    ],
  };

  it('normalizes each editable element to a resolved { editor, id }', () => {
    const stamped = stampEditIds(uischema);
    expect(stamped.elements[0]?.options).toEqual({
      description: 'keep me',
      edit: { editor: null, id: 'service-description', actionLabel: null },
    });
  });

  it('leaves non-editable elements alone', () => {
    expect(stampEditIds(uischema).elements[1]?.options).toEqual({ description: 'untouched' });
  });

  it('does not mutate the input', () => {
    stampEditIds(uischema);
    expect(uischema.elements[0]?.options).toEqual({ description: 'keep me', edit: true });
  });

  it('resolves the same ids collectEditableSections does', () => {
    const stamped = stampEditIds(uischema);
    expect(collectEditableSections(stamped).map((s) => s.id)).toEqual(
      collectEditableSections(uischema).map((s) => s.id),
    );
  });
});

describe('scopePath / collectScopes', () => {
  it('strips the pointer scaffolding', () => {
    expect(scopePath('#/properties/details/properties/faq')).toEqual(['details', 'faq']);
    expect(scopePath('#/properties/title')).toEqual(['title']);
  });

  it('collects scopes from nested layouts', () => {
    expect(
      collectScopes([
        { type: 'Group', elements: [control('#/properties/a'), control('#/properties/b')] },
      ]),
    ).toEqual(['#/properties/a', '#/properties/b']);
  });
});

describe('scopedSchema', () => {
  const schema = {
    type: 'object',
    required: ['title', 'details', 'eligibility'],
    properties: {
      title: { type: 'string' },
      eligibility: { type: 'string' },
      details: {
        type: 'object',
        required: ['faq', 'about'],
        properties: {
          about: { type: 'object' },
          faq: {
            type: 'array',
            items: { type: 'object', required: ['title', 'description'], properties: {} },
          },
        },
      },
    },
  };

  const at = (scoped: Record<string, unknown>, path: string): Record<string, unknown> =>
    path
      .split('.')
      .reduce<
        Record<string, unknown>
      >((node, key) => (node[key] ?? {}) as Record<string, unknown>, scoped);

  it('keeps required only for properties the subtree reaches', () => {
    const scoped = scopedSchema(schema, [
      { type: 'Group', elements: [control('#/properties/details/properties/faq')] },
    ]);
    expect(scoped.required).toEqual(['details']);
    expect(at(scoped, 'properties.details').required).toEqual(['faq']);
  });

  it('leaves items.required alone so per-item validation survives', () => {
    const scoped = scopedSchema(schema, [control('#/properties/details/properties/faq')]);
    expect(at(scoped, 'properties.details.properties.faq.items').required).toEqual([
      'title',
      'description',
    ]);
  });

  it('prunes every required when the subtree collects no scopes', () => {
    const scoped = scopedSchema(schema, [{ type: 'Group', elements: [] }]);
    expect(scoped.required).toEqual([]);
    expect(at(scoped, 'properties.details').required).toEqual([]);
  });

  it('keeps all properties so absolute scopes still resolve', () => {
    const scoped = scopedSchema(schema, [control('#/properties/title')]);
    expect(Object.keys(scoped.properties as object)).toEqual(['title', 'eligibility', 'details']);
    expect(scoped.required).toEqual(['title']);
  });

  it('does not mutate the input schema', () => {
    scopedSchema(schema, [control('#/properties/title')]);
    expect(schema.required).toEqual(['title', 'details', 'eligibility']);
    expect(schema.properties.details.required).toEqual(['faq', 'about']);
  });
});

describe('slugify', () => {
  it('collapses non-alphanumerics and trims', () => {
    expect(slugify('Data & Privacy')).toBe('data-privacy');
    expect(slugify('  Service description  ')).toBe('service-description');
    expect(slugify('!!!')).toBe('');
  });

  it('trims runs of leading and trailing separators', () => {
    expect(slugify('--- Step 1: Apply ---')).toBe('step-1-apply');
    expect(slugify('   ')).toBe('');
    expect(slugify(`${'-'.repeat(1000)}a${'-'.repeat(1000)}`)).toBe('a');
  });
});

import { describe, expect, it } from 'vitest';
import { contentSchemas } from '../../../../../src/modules/catalog/util/format';

/**
 * Feature 217: `serviceDataString` (read a display string out of the version `data`, falling back
 * to the document column) and `definitionSchemas` (split the bound TYPE version's `definition`) are
 * both gone. Title and description are generated columns now, and a service renders from its OWN
 * version content.
 */
describe('contentSchemas', () => {
  it('splits a content into its schema, variants and answers', () => {
    const content = {
      schema: { type: 'object', properties: { name: { type: 'string' } } },
      variants: { default: { type: 'Form', elements: [] }, brief: { type: 'Form', elements: [] } },
      data: { name: 'Ada' },
    };

    expect(contentSchemas(content)).toEqual(content);
  });

  it('falls back to an empty schema and an empty default variant when either half is absent', () => {
    const empty = { schema: {}, variants: { default: {} }, data: {} };
    expect(contentSchemas({})).toEqual(empty);
    expect(contentSchemas({ schema: { type: 'object' } })).toEqual(empty);
    // Doc 275: the old `{ schema, uischema }` shape is no longer read.
    expect(contentSchemas({ schema: { type: 'object' }, uischema: { type: 'Form' } })).toEqual(
      empty,
    );
  });

  it('tolerates null and undefined rather than throwing', () => {
    expect(contentSchemas(null)).toEqual({ schema: {}, variants: { default: {} }, data: {} });
    expect(contentSchemas(undefined)).toEqual({ schema: {}, variants: { default: {} }, data: {} });
  });

  it('gives no answers when the content has none', () => {
    expect(contentSchemas({ schema: {}, variants: { default: {} } }).data).toEqual({});
  });

  it('ignores keys that are neither schema, variants nor data', () => {
    const result = contentSchemas({
      schema: {},
      variants: { default: {} },
      data: {},
      capabilities: { elements: {} },
    });

    expect(Object.keys(result).toSorted()).toEqual(['data', 'schema', 'variants']);
  });
});

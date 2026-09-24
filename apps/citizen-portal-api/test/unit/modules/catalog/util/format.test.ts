import { describe, expect, it } from 'vitest';
import { contentSchemas } from '../../../../../src/modules/catalog/util/format';

/**
 * Feature 217: `serviceDataString` (read a display string out of the version `data`, falling back
 * to the document column) and `definitionSchemas` (split the bound TYPE version's `definition`) are
 * both gone. Title and description are generated columns now, and a service renders from its OWN
 * version content.
 */
describe('contentSchemas', () => {
  it('splits a content into its schema and uischema', () => {
    const content = {
      schema: { type: 'object', properties: { name: { type: 'string' } } },
      uischema: { type: 'Service', elements: [] },
    };

    expect(contentSchemas(content)).toEqual(content);
  });

  it('defaults either half to an empty object when absent', () => {
    expect(contentSchemas({})).toEqual({ schema: {}, uischema: {} });
    expect(contentSchemas({ schema: { type: 'object' } })).toEqual({
      schema: { type: 'object' },
      uischema: {},
    });
  });

  it('tolerates null and undefined rather than throwing', () => {
    expect(contentSchemas(null)).toEqual({ schema: {}, uischema: {} });
    expect(contentSchemas(undefined)).toEqual({ schema: {}, uischema: {} });
  });

  it('ignores keys that are neither schema nor uischema', () => {
    const result = contentSchemas({ schema: {}, uischema: {}, data: { title: 'x' } });

    expect(Object.keys(result).toSorted()).toEqual(['schema', 'uischema']);
  });
});

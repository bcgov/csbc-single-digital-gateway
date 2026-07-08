import { describe, expect, it } from 'vitest';
import {
  serviceDataString,
  definitionSchemas,
} from '../../../../../src/modules/catalog/util/format';

describe('catalog format utils', () => {
  describe('serviceDataString', () => {
    it('should return the custom value from data record if it is a valid non-empty string', () => {
      const data = { title: 'Custom Title', description: 'Custom Description' };
      expect(serviceDataString(data, 'title', 'Fallback')).toBe('Custom Title');
      expect(serviceDataString(data, 'description', 'Fallback')).toBe('Custom Description');
    });

    it('should return the fallback if the key is missing in the data record', () => {
      const data = { otherKey: 'value' };
      expect(serviceDataString(data, 'title', 'Fallback Title')).toBe('Fallback Title');
    });

    it('should return the fallback if the value in data record is not a string', () => {
      const data = { title: 123, description: true, tags: ['health'] };
      expect(serviceDataString(data, 'title', 'Fallback')).toBe('Fallback');
      expect(serviceDataString(data, 'description', 'Fallback')).toBe('Fallback');
      expect(serviceDataString(data, 'tags', 'Fallback')).toBe('Fallback');
    });

    it('should return the fallback if the value in data record is null or undefined', () => {
      const data = { title: null, description: undefined };
      expect(serviceDataString(data, 'title', 'Fallback')).toBe('Fallback');
      expect(serviceDataString(data, 'description', 'Fallback')).toBe('Fallback');
    });

    it('should return the fallback if the value is empty or only whitespace', () => {
      const data = { title: '', description: '   ' };
      expect(serviceDataString(data, 'title', 'Fallback')).toBe('Fallback');
      expect(serviceDataString(data, 'description', 'Fallback')).toBe('Fallback');
    });
  });

  describe('definitionSchemas', () => {
    it('should return empty schema and uischema if definition is undefined or null', () => {
      expect(definitionSchemas(undefined)).toEqual({ schema: {}, uischema: {} });
      expect(definitionSchemas(null)).toEqual({ schema: {}, uischema: {} });
    });

    it('should return schema and uischema from definition if both are present', () => {
      const definition = {
        schema: { type: 'object', properties: { name: { type: 'string' } } },
        uischema: { type: 'VerticalLayout', elements: [] },
      };
      expect(definitionSchemas(definition)).toEqual({
        schema: { type: 'object', properties: { name: { type: 'string' } } },
        uischema: { type: 'VerticalLayout', elements: [] },
      });
    });

    it('should fall back to empty objects if schema or uischema are missing in definition', () => {
      const definitionOnlySchema = {
        schema: { type: 'object' },
      };
      expect(definitionSchemas(definitionOnlySchema)).toEqual({
        schema: { type: 'object' },
        uischema: {},
      });

      const definitionOnlyUischema = {
        uischema: { type: 'VerticalLayout' },
      };
      expect(definitionSchemas(definitionOnlyUischema)).toEqual({
        schema: {},
        uischema: { type: 'VerticalLayout' },
      });

      const emptyDefinition = {};
      expect(definitionSchemas(emptyDefinition)).toEqual({
        schema: {},
        uischema: {},
      });
    });
  });
});

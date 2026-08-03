import { describe, expect, it } from 'vitest';
import {
  ROOT_GROUP,
  groupId,
  controlId,
  displayId,
  containerId,
  buildRecord,
  applyRecord,
} from '@/components/form-builder/dnd';
import type { FormModel } from '@/components/form-builder/model';

describe('DND Utility Helpers Component Test Suite', () => {
  describe('ID generators', () => {
    it('generates correct IDs for groups, controls, display items and containers', () => {
      expect(groupId(2)).toBe('g:2');
      expect(controlId('name')).toBe('f:name');
      expect(displayId('d-1')).toBe('d:d-1');
      expect(containerId(5)).toBe('c:5');
    });
  });

  describe('buildRecord', () => {
    it('returns empty root group for empty fields model', () => {
      const model: FormModel = {
        title: 'Form',
        description: 'Desc',
        fields: [],
      };
      expect(buildRecord(model)).toEqual({
        [ROOT_GROUP]: [],
      });
    });

    it('builds flat record for fields without containers', () => {
      const model: FormModel = {
        title: 'Form',
        description: 'Desc',
        fields: [
          { kind: 'control', key: 'username', label: 'User', type: 'text' } as any,
          { kind: 'display', id: 'h-1', displayType: 'heading', text: 'Hi', level: 2 } as any,
        ],
      };

      expect(buildRecord(model)).toEqual({
        [ROOT_GROUP]: ['f:username', 'd:h-1'],
      });
    });

    it('builds hierarchical record for models containing containers', () => {
      const model: FormModel = {
        title: 'Form',
        description: 'Desc',
        fields: [
          { kind: 'control', key: 'username', label: 'User', type: 'text' } as any,
          {
            kind: 'container',
            id: 'c-1',
            title: 'Contact block',
            children: [
              { kind: 'control', key: 'email', label: 'Email', type: 'text' } as any,
              {
                kind: 'display',
                id: 'p-1',
                displayType: 'paragraph',
                text: 'Text',
                align: 'left',
              } as any,
            ],
          } as any,
        ],
      };

      expect(buildRecord(model)).toEqual({
        [ROOT_GROUP]: ['f:username', 'c:1'],
        'g:1': ['f:email', 'd:p-1'],
      });
    });
  });

  describe('applyRecord', () => {
    const originalModel: FormModel = {
      title: 'Survey',
      description: 'Survey Desc',
      fields: [
        { kind: 'control', key: 'first_name', label: 'First Name', type: 'text' } as any,
        { kind: 'display', id: 'h-1', displayType: 'heading', text: 'Section 1', level: 2 } as any,
        {
          kind: 'container',
          id: 'c-1',
          title: 'Details Block',
          children: [
            { kind: 'control', key: 'email', label: 'Email', type: 'text' } as any,
            {
              kind: 'display',
              id: 'p-1',
              displayType: 'paragraph',
              text: 'Text info',
              align: 'left',
            } as any,
          ],
        } as any,
      ],
    };

    it('correctly reorders items in root group', () => {
      const record = {
        [ROOT_GROUP]: ['d:h-1', 'f:first_name', 'c:2'],
        'g:2': ['f:email', 'd:p-1'],
      };

      const result = applyRecord(originalModel, record);

      expect(result.fields).toHaveLength(3);
      expect(result.fields[0]).toEqual(originalModel.fields[1]); // heading
      expect(result.fields[1]).toEqual(originalModel.fields[0]); // first_name
      expect(result.fields[2]).toEqual(originalModel.fields[2]); // container
    });

    it('moves fields in and out of containers', () => {
      // Move email out of container to root, and move heading into container
      const record = {
        [ROOT_GROUP]: ['f:first_name', 'f:email', 'c:2'],
        'g:2': ['d:h-1', 'd:p-1'],
      };

      const result = applyRecord(originalModel, record);

      expect(result.fields).toHaveLength(3);
      expect(result.fields[0]).toEqual(originalModel.fields[0]); // first_name
      expect(result.fields[1]?.kind).toBe('control');
      expect((result.fields[1] as any)?.key).toBe('email'); // email is now at root

      const container = result.fields[2] as any;
      expect(container.kind).toBe('container');
      expect(container.children).toHaveLength(2);
      expect(container.children[0]).toEqual(originalModel.fields[1]); // heading is now in container
      expect(container.children[1].id).toBe('p-1'); // paragraph remains
    });

    it('filters out invalid or missing node IDs safely', () => {
      const record = {
        [ROOT_GROUP]: ['f:non_existent_key', 'd:h-1', 'c:999', 'c:2'],
        'g:2': ['f:email', 'f:another_invalid_key'],
      };

      const result = applyRecord(originalModel, record);

      // result fields should ignore 'f:non_existent_key' and container 'c:999'
      expect(result.fields).toHaveLength(2);
      expect(result.fields[0]).toEqual(originalModel.fields[1]); // d:h-1

      const container = result.fields[1] as any;
      expect(container.kind).toBe('container');
      // Should filter out the invalid key inside the container children
      expect(container.children).toHaveLength(1);
      expect(container.children[0].key).toBe('email');
    });

    it('handles missing root group, non-container indices, invalid prefixes, and missing child groups safely', () => {
      const invalidRecord = {};
      const resultEmpty = applyRecord(originalModel, invalidRecord);
      expect(resultEmpty.fields).toEqual([]);

      const mockModelWithNonContainer: FormModel = {
        title: 'Survey',
        description: 'Survey Desc',
        fields: [
          { kind: 'control', key: 'first_name', label: 'First Name', type: 'text' } as any,
          {
            kind: 'container',
            id: 'c-1',
            title: 'Details Block',
            children: [{ kind: 'control', key: 'email', label: 'Email', type: 'text' } as any],
          } as any,
        ],
      };

      const customRecord = {
        [ROOT_GROUP]: ['c:0', 'c:1', 'x:invalid_id'],
      };

      const result = applyRecord(mockModelWithNonContainer, customRecord);

      expect(result.fields).toHaveLength(1);
      const container = result.fields[0] as any;
      expect(container.kind).toBe('container');
      expect(container.children).toEqual([]);
    });
  });
});

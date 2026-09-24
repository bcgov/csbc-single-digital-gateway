import { describe, expect, it } from 'vitest';
import {
  createFormSchema,
  formSchema,
  formVersionSchema,
  formWithVersionSchema,
  toFormDto,
  toFormVersionDto,
  updateFormContentSchema,
} from '../../../../../src/modules/forms/dtos/form.dtos';

const VALID_UUID = 'e6005cbb-84f9-467a-bb48-e8cbffc9c991';
const FORM_CONTENT = {
  schema: { type: 'object', properties: { name: { type: 'string' } } },
  uischema: { type: 'Form', elements: [], label: 'Apply online' },
};
const FLOW_CONTENT = {
  schema: { type: 'object', properties: {} },
  uischema: { type: 'Flow', elements: [], label: 'Guided application' },
};

describe('form DTO schemas (feature 217)', () => {
  describe('createFormSchema', () => {
    it('takes a workspace and a title, with content optional', () => {
      expect(createFormSchema.parse({ workspaceId: VALID_UUID, title: 'Apply online' })).toEqual({
        workspaceId: VALID_UUID,
        title: 'Apply online',
      });
    });

    it('accepts an explicit content', () => {
      const parsed = createFormSchema.parse({
        workspaceId: VALID_UUID,
        title: 'Apply online',
        content: FORM_CONTENT,
      });

      expect(parsed.content).toEqual(FORM_CONTENT);
    });

    it('no longer takes a typeId — the three form kinds collapsed into one type', () => {
      const parsed = createFormSchema.parse({
        workspaceId: VALID_UUID,
        title: 'Apply online',
        typeId: VALID_UUID,
      });

      expect(parsed).not.toHaveProperty('typeId');
    });

    it('rejects an empty title', () => {
      expect(createFormSchema.safeParse({ workspaceId: VALID_UUID, title: ' ' }).success).toBe(
        false,
      );
    });
  });

  describe('updateFormContentSchema', () => {
    it('accepts both a Form and a Flow root — the flavour lives in the content', () => {
      expect(updateFormContentSchema.parse({ content: FORM_CONTENT }).content.uischema.type).toBe(
        'Form',
      );
      expect(updateFormContentSchema.parse({ content: FLOW_CONTENT }).content.uischema.type).toBe(
        'Flow',
      );
    });

    it('rejects a content missing either half', () => {
      expect(updateFormContentSchema.safeParse({ content: { schema: {} } }).success).toBe(false);
      expect(
        updateFormContentSchema.safeParse({ content: { uischema: FORM_CONTENT.uischema } }).success,
      ).toBe(false);
    });

    it('requires uischema.elements to be an array', () => {
      expect(
        updateFormContentSchema.safeParse({
          content: { schema: { type: 'object', properties: {} }, uischema: { type: 'Form' } },
        }).success,
      ).toBe(false);
    });
  });

  describe('response schemas', () => {
    it('pins the document type and allows a null title', () => {
      const form = {
        id: VALID_UUID,
        workspaceId: VALID_UUID,
        title: null,
        type: 'application-method',
        createdAt: '2026-07-28T12:00:00.000Z',
      };

      expect(formSchema.parse(form)).toEqual(form);
      expect(formSchema.safeParse({ ...form, type: 'service' }).success).toBe(false);
    });

    it('carries content, revision and the generated title/description on a version', () => {
      const version = {
        id: VALID_UUID,
        documentId: VALID_UUID,
        versionNumber: 1,
        revision: 2,
        status: 'draft',
        title: 'Apply online',
        description: null,
        content: FORM_CONTENT,
        createdAt: '2026-07-28T12:00:00.000Z',
      };

      expect(formVersionSchema.parse(version)).toEqual(version);
      expect(
        formWithVersionSchema.parse({
          form: {
            id: VALID_UUID,
            workspaceId: VALID_UUID,
            title: 'Apply online',
            type: 'application-method',
            createdAt: '2026-07-28T12:00:00.000Z',
          },
          version,
        }),
      ).toBeDefined();
    });
  });

  describe('row → DTO mappers', () => {
    const now = new Date('2026-07-28T12:00:00.000Z');
    const doc = {
      id: VALID_UUID,
      templateId: null,
      workspaceId: VALID_UUID,
      kind: 'document' as const,
      type: 'application-method' as const,
      templateKind: 'template' as const,
      createdAt: now,
      updatedAt: now,
    };

    it('takes the title from the version, not the document row', () => {
      expect(toFormDto(doc, { title: 'Apply online' }).title).toBe('Apply online');
      expect(toFormDto(doc).title).toBeNull();
    });

    it('refuses a workspace-less form document', () => {
      expect(() => toFormDto({ ...doc, workspaceId: null })).toThrow(/no workspace/);
    });

    it('refuses a document of the wrong type rather than mislabelling it', () => {
      expect(() => toFormDto({ ...doc, type: 'service' })).toThrow(/not an application method/);
    });

    it('maps a version row, serialising dates and passing content through', () => {
      const dto = toFormVersionDto({
        id: VALID_UUID,
        documentId: VALID_UUID,
        templateId: null,
        templateVersionId: null,
        versionNumber: 2,
        revision: 4,
        title: 'Apply online',
        description: 'How to apply',
        content: FLOW_CONTENT,
        status: 'draft',
        publishedAt: null,
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      });

      expect(dto).toEqual({
        id: VALID_UUID,
        documentId: VALID_UUID,
        versionNumber: 2,
        revision: 4,
        status: 'draft',
        title: 'Apply online',
        description: 'How to apply',
        content: FLOW_CONTENT,
        createdAt: '2026-07-28T12:00:00.000Z',
      });
    });
  });
});

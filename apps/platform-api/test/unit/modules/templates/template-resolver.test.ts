import { BadRequestException, ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TemplateResolver } from '../../../../src/modules/templates/services/template.resolver';

// Doc 228 — choosing the template at create; versions follow the document's own template.

const row = (templateId: string) => ({
  templateId,
  templateVersionId: `${templateId}-published`,
  content: {
    schema: { type: 'object', properties: {} },
    variants: { default: { type: 'Form', label: templateId, elements: [] } },
  },
});

describe('TemplateResolver (doc 228)', () => {
  let resolver: TemplateResolver;
  let rows: unknown[];
  let where: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    rows = [];
    // The published-templates query: select → from → innerJoin → where, which resolves.
    where = vi.fn(() => Promise.resolve(rows));
    const query = { from: vi.fn(), innerJoin: vi.fn(), where };
    query.from.mockReturnValue(query);
    query.innerJoin.mockReturnValue(query);
    const db = { select: vi.fn(() => query) };
    resolver = new TemplateResolver(db as never);
  });

  describe('forCreate', () => {
    it('resolves the requested published template of the type', async () => {
      rows = [row('tpl-2')];

      const resolved = await resolver.forCreate('services.service', 'tpl-2');

      expect(resolved).toEqual({
        templateId: 'tpl-2',
        templateVersionId: 'tpl-2-published',
        schema: { type: 'object', properties: {} },
        variants: { default: { type: 'Form', label: 'tpl-2', elements: [] } },
      });
      expect(where).toHaveBeenCalledTimes(1);
    });

    it('400s a template of another type, a draft-only one, or an unknown id', async () => {
      // The query filters by kind, type, id AND a published version, so each of those comes back
      // empty — and the caller supplied the id, so it is a bad request, not a server fault.
      rows = [];

      const attempt = resolver.forCreate('services.service-agreement', 'tpl-9');
      await expect(attempt).rejects.toBeInstanceOf(BadRequestException);
      await expect(attempt).rejects.toThrow(
        'Template not found, or not a published service agreement template.',
      );
    });

    it('uses the only published template of the type when no id is given', async () => {
      rows = [row('tpl-only')];

      const resolved = await resolver.forCreate('services.service-application-method');

      expect(resolved.templateId).toBe('tpl-only');
      expect(resolved.templateVersionId).toBe('tpl-only-published');
    });

    it('400s an omitted id when zero or several are published', async () => {
      rows = [];
      await expect(resolver.forCreate('services.service')).rejects.toThrow(
        'No service template is published yet. An admin must publish one first.',
      );

      rows = [row('a'), row('b')];
      const attempt = resolver.forCreate('services.service');
      await expect(attempt).rejects.toBeInstanceOf(BadRequestException);
      await expect(attempt).rejects.toThrow(
        'Choose a template: 2 service templates are published.',
      );
    });
  });

  describe('forDocument', () => {
    it("resolves the published version of the document's own template", async () => {
      rows = [row('tpl-own')];

      const resolved = await resolver.forDocument('tpl-own');

      expect(resolved.templateId).toBe('tpl-own');
      expect(resolved.templateVersionId).toBe('tpl-own-published');
    });

    it('409s when that template has no published version', async () => {
      rows = [];
      const attempt = resolver.forDocument('tpl-own');
      await expect(attempt).rejects.toBeInstanceOf(ConflictException);
      await expect(attempt).rejects.toThrow(/template has no published version/);

      // A document that names no template never queries at all.
      where.mockClear();
      await expect(resolver.forDocument(null)).rejects.toBeInstanceOf(ConflictException);
      expect(where).not.toHaveBeenCalled();
    });
  });
});

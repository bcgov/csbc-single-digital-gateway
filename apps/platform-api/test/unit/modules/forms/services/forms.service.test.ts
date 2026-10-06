import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { documentVersions, documents } from '@repo/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FormsService } from '../../../../../src/modules/forms/services/forms.service';

/**
 * Feature 217. A form is an APPLICATION METHOD document: no `typeId` on create, one `content`
 * instead of a per-kind `definition`, and no title column to sync (the title is GENERATED from
 * the default variant's label, `content.variants.default.label` — doc 275).
 */

const TEMPLATE = {
  templateId: 'template-1',
  templateVersionId: 'template-version-1',
  schema: { type: 'object', properties: {} },
  variants: { default: { type: 'Form', elements: [] } },
};

const CONTENT = {
  schema: { type: 'object', properties: {} },
  variants: { default: { type: 'Form', elements: [], label: 'Apply online' } },
};

/** A governed uischema with its one Control relabelled — the edit a frozen template refuses. */
const relabel = <T extends object>(uischema: T) => ({
  ...uischema,
  elements: [{ type: 'Control', id: 'a1', scope: '#/properties/a', label: 'CHANGED' }],
});

describe('FormsService', () => {
  let service: FormsService;
  let dbMock: any;
  let txMock: any;
  let templatesMock: any;

  beforeEach(() => {
    txMock = {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
    };

    dbMock = {
      transaction: vi.fn().mockImplementation((cb) => cb(txMock)),
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      returning: vi.fn(),
    };

    templatesMock = {
      forCreate: vi.fn().mockResolvedValue(TEMPLATE),
      // Doc 222: ungoverned — these cases are about versioning, not capabilities.
      capabilitiesForVersion: vi.fn().mockResolvedValue(undefined),
      // Doc 221: the READ path resolves the PINNED template version; `forCreate` stays for CREATE.
      contentForVersion: vi.fn().mockResolvedValue({
        schema: TEMPLATE.schema,
        variants: TEMPLATE.variants,
      }),
    };

    service = new FormsService(dbMock, templatesMock);
  });

  const doc = {
    id: 'doc-1',
    workspaceId: 'ws-1',
    type: 'services.service-application-method',
    kind: 'document',
    createdAt: new Date('2026-07-28T12:00:00.000Z'),
    updatedAt: new Date('2026-07-28T12:00:00.000Z'),
  };
  const version = {
    id: 'version-1',
    documentId: 'doc-1',
    templateId: TEMPLATE.templateId,
    templateVersionId: TEMPLATE.templateVersionId,
    versionNumber: 1,
    revision: 1,
    status: 'draft',
    title: 'Apply online',
    description: null,
    content: CONTENT,
    createdAt: new Date('2026-07-28T12:00:00.000Z'),
  };

  describe('create', () => {
    const input = { workspaceId: 'ws-1', title: 'Apply online' };

    it('creates the document and its draft v1 inside one transaction', async () => {
      dbMock.limit.mockResolvedValueOnce([{ role: 'member' }]);
      txMock.returning.mockResolvedValueOnce([doc]).mockResolvedValueOnce([version]);

      const result = await service.create('user-1', input);

      expect(dbMock.transaction).toHaveBeenCalledTimes(1);
      expect(txMock.insert).toHaveBeenNthCalledWith(1, documents);
      expect(txMock.insert).toHaveBeenNthCalledWith(2, documentVersions);
      expect(result.form.id).toBe('doc-1');
      expect(result.version.id).toBe('version-1');
    });

    it('resolves the application-method template, not a caller-supplied type', async () => {
      dbMock.limit.mockResolvedValueOnce([{ role: 'member' }]);
      txMock.returning.mockResolvedValueOnce([doc]).mockResolvedValueOnce([version]);

      await service.create('user-1', input);

      expect(templatesMock.forCreate).toHaveBeenCalledWith(
        'services.service-application-method',
        undefined,
      );
      expect(txMock.values).toHaveBeenNthCalledWith(1, {
        type: 'services.service-application-method',
        kind: 'document',
        workspaceId: 'ws-1',
        templateId: TEMPLATE.templateId,
      });
    });

    it('stamps the title into the label the GENERATED title column reads', async () => {
      dbMock.limit.mockResolvedValueOnce([{ role: 'member' }]);
      txMock.returning.mockResolvedValueOnce([doc]).mockResolvedValueOnce([version]);

      await service.create('user-1', input);

      const values = txMock.values.mock.calls[1][0];
      // Doc 275: a copy of the template's schema and variants, the label on the DEFAULT variant.
      expect(values.content).toEqual({
        schema: TEMPLATE.schema,
        variants: { default: { type: 'Form', elements: [], label: 'Apply online' } },
      });
      expect(values.templateVersionId).toBe(TEMPLATE.templateVersionId);
      expect(values.versionNumber).toBe(1);
    });

    it('uses an explicitly supplied content instead of the template', async () => {
      dbMock.limit.mockResolvedValueOnce([{ role: 'member' }]);
      txMock.returning.mockResolvedValueOnce([doc]).mockResolvedValueOnce([version]);
      const custom = {
        schema: { type: 'object', properties: {} },
        variants: { default: { type: 'Funnel', elements: [], label: 'Guided' } },
      };

      await service.create('user-1', { ...input, content: custom });

      expect(txMock.values.mock.calls[1][0].content).toEqual(custom);
    });

    it.each(['Service', 'Flow'])(
      'rejects a %s root — an application method is a Form or a Funnel (doc 275)',
      async (root) => {
        dbMock.limit.mockResolvedValueOnce([{ role: 'member' }]);
        txMock.returning.mockResolvedValueOnce([doc]);
        const badRoot = {
          schema: { type: 'object', properties: {} },
          variants: { default: { type: root, elements: [] } },
        };

        await expect(service.create('user-1', { ...input, content: badRoot })).rejects.toThrow(
          BadRequestException,
        );
      },
    );

    it("rejects a variant whose root differs from the default's", async () => {
      dbMock.limit.mockResolvedValueOnce([{ role: 'member' }]);
      txMock.returning.mockResolvedValueOnce([doc]);
      const mixed = {
        schema: { type: 'object', properties: {} },
        variants: {
          default: { type: 'Form', elements: [] },
          guided: { type: 'Funnel', elements: [] },
        },
      };

      await expect(service.create('user-1', { ...input, content: mixed })).rejects.toThrow(
        /every variant must match the default's "Form"/,
      );
    });

    it('throws NotFoundException if the user is not a workspace member', async () => {
      dbMock.limit.mockResolvedValueOnce([]);

      await expect(service.create('user-1', input)).rejects.toThrow(NotFoundException);
    });

    it('throws if the document insert returns no row', async () => {
      dbMock.limit.mockResolvedValueOnce([{ role: 'member' }]);
      txMock.returning.mockResolvedValueOnce([]);

      await expect(service.create('user-1', input)).rejects.toThrow(
        'document insert returned no row',
      );
    });

    it('throws if the version insert returns no row', async () => {
      dbMock.limit.mockResolvedValueOnce([{ role: 'member' }]);
      txMock.returning.mockResolvedValueOnce([doc]).mockResolvedValueOnce([]);

      await expect(service.create('user-1', input)).rejects.toThrow(
        'document version insert returned no row',
      );
    });
  });

  describe('get', () => {
    it('returns the document and its latest version', async () => {
      dbMock.limit.mockResolvedValueOnce([{ doc }]).mockResolvedValueOnce([version]);

      const result = await service.get('user-1', 'doc-1');

      expect(result.form.id).toBe('doc-1');
      expect(result.form.title).toBe('Apply online');
      expect(result.version.content).toEqual(CONTENT);
    });

    it('throws NotFoundException if the document has no versions', async () => {
      dbMock.limit.mockResolvedValueOnce([{ doc }]).mockResolvedValueOnce([]);

      await expect(service.get('user-1', 'doc-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if the document is absent or the caller is not a member', async () => {
      dbMock.limit.mockResolvedValueOnce([]);

      await expect(service.get('user-1', 'doc-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateContent', () => {
    const input = { content: CONTENT };

    it('writes the content and bumps the revision', async () => {
      dbMock.limit.mockResolvedValueOnce([{ doc }]).mockResolvedValueOnce([version]);
      dbMock.returning.mockResolvedValueOnce([{ ...version, revision: 2 }]);

      const result = await service.updateContent('user-1', 'doc-1', 'version-1', input);

      expect(dbMock.update).toHaveBeenCalledWith(documentVersions);
      const setArg = dbMock.set.mock.calls[0][0];
      expect(setArg.content).toEqual(CONTENT);
      expect(setArg.revision).toBeDefined();
      expect(result.revision).toBe(2);
    });

    it('never writes a title — the document has no title column', async () => {
      dbMock.limit.mockResolvedValueOnce([{ doc }]).mockResolvedValueOnce([version]);
      dbMock.returning.mockResolvedValueOnce([version]);

      await service.updateContent('user-1', 'doc-1', 'version-1', input);

      expect(dbMock.update).toHaveBeenCalledTimes(1);
      expect(dbMock.update).not.toHaveBeenCalledWith(documents);
      expect(dbMock.set.mock.calls[0][0]).not.toHaveProperty('title');
    });

    it('rejects a content whose root is not allowed for an application method', async () => {
      dbMock.limit.mockResolvedValueOnce([{ doc }]).mockResolvedValueOnce([version]);

      await expect(
        service.updateContent('user-1', 'doc-1', 'version-1', {
          content: {
            schema: { type: 'object', properties: {} },
            variants: { default: { type: 'Flow', elements: [] } },
          },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    // Doc 222 — the studio's gates are UX. This endpoint and the studio's own uischema code panel
    // both bypass them, so a governing template has to be enforced HERE or it is not enforced.
    describe('under a governing template', () => {
      const GOVERNED = {
        schema: { type: 'object', properties: { a: { type: 'string' } } },
        variants: {
          default: {
            type: 'Form',
            id: 'root1',
            label: 'Apply online',
            elements: [{ type: 'Control', id: 'a1', scope: '#/properties/a', label: 'Name' }],
          },
        },
      };
      const CLOSED = {
        edit: 'none',
        remove: false,
        move: false,
        addChildren: false,
        removeChildren: false,
        reorderChildren: false,
        edges: false,
      };
      const governedVersion = { ...version, content: GOVERNED };
      const relabelled = { ...GOVERNED, variants: { default: relabel(GOVERNED.variants.default) } };

      const govern = (capabilities: unknown) =>
        templatesMock.capabilitiesForVersion.mockResolvedValue(capabilities);

      it('refuses an edit the template froze, with 422', async () => {
        govern({ default: { '*': CLOSED } });
        dbMock.limit.mockResolvedValueOnce([{ doc }]).mockResolvedValueOnce([governedVersion]);

        await expect(
          service.updateContent('user-1', 'doc-1', 'version-1', { content: relabelled }),
        ).rejects.toThrow(UnprocessableEntityException);
        // The refusal must happen BEFORE the write, not be cleaned up after one.
        expect(dbMock.update).not.toHaveBeenCalled();
      });

      it('names the element and the field it refused', async () => {
        govern({ default: { '*': CLOSED } });
        dbMock.limit.mockResolvedValueOnce([{ doc }]).mockResolvedValueOnce([governedVersion]);

        const error = await service
          .updateContent('user-1', 'doc-1', 'version-1', { content: relabelled })
          .catch((thrown: UnprocessableEntityException) => thrown);

        const body = (error as UnprocessableEntityException).getResponse() as {
          violations: { code: string; elementId: string; field: string }[];
        };
        expect(body.violations).toEqual([
          expect.objectContaining({ code: 'edit', elementId: 'a1', field: 'label' }),
        ]);
      });

      it('allows the same edit when the template grants that field', async () => {
        govern({ default: { '*': CLOSED }, elements: { a1: { edit: ['label'] } } });
        dbMock.limit.mockResolvedValueOnce([{ doc }]).mockResolvedValueOnce([governedVersion]);
        dbMock.returning.mockResolvedValueOnce([{ ...governedVersion, revision: 2 }]);

        await expect(
          service.updateContent('user-1', 'doc-1', 'version-1', { content: relabelled }),
        ).resolves.toBeDefined();
        expect(dbMock.update).toHaveBeenCalled();
      });

      // Doc 275: the map governs EVERY variant, each checked against its own previous self.
      describe('across variants', () => {
        const TWO = {
          ...GOVERNED,
          variants: { default: GOVERNED.variants.default, mobile: GOVERNED.variants.default },
        };
        const twoVersion = { ...version, content: TWO };
        const violationsOf = async (content: unknown, from: unknown = twoVersion) => {
          dbMock.limit.mockResolvedValueOnce([{ doc }]).mockResolvedValueOnce([from]);
          const error = await service
            .updateContent('user-1', 'doc-1', 'version-1', { content } as never)
            .catch((thrown: unknown) => thrown);
          expect(error).toBeInstanceOf(UnprocessableEntityException);
          expect(dbMock.update).not.toHaveBeenCalled();
          return (
            (error as UnprocessableEntityException).getResponse() as {
              violations: { code: string; elementId?: string; field?: string }[];
            }
          ).violations;
        };

        it('refuses a frozen edit made only in a non-default variant', async () => {
          govern({ default: { '*': CLOSED } });

          const violations = await violationsOf({
            ...TWO,
            variants: { default: TWO.variants.default, mobile: relabel(TWO.variants.mobile) },
          });

          expect(violations).toEqual([
            expect.objectContaining({ code: 'edit', elementId: 'a1', field: 'label' }),
          ]);
        });

        it('reports the same refusal once when every variant makes it', async () => {
          govern({ default: { '*': CLOSED } });

          const violations = await violationsOf({
            ...TWO,
            variants: {
              default: relabel(TWO.variants.default),
              mobile: relabel(TWO.variants.mobile),
            },
          });

          expect(violations).toHaveLength(1);
        });

        it('refuses adding a variant to a governed document (variant-added)', async () => {
          govern({});

          const violations = await violationsOf(TWO, governedVersion);

          expect(violations).toEqual([expect.objectContaining({ code: 'variant-added' })]);
          // No element or field to name — the keys are absent, not undefined.
          expect(violations[0]).not.toHaveProperty('elementId');
          expect(violations[0]).not.toHaveProperty('field');
        });

        it('refuses removing a variant from a governed document (variant-removed)', async () => {
          govern({});

          const violations = await violationsOf(GOVERNED);

          expect(violations).toEqual([expect.objectContaining({ code: 'variant-removed' })]);
        });

        it('lets an ungoverned document add a variant', async () => {
          govern(undefined);
          dbMock.limit.mockResolvedValueOnce([{ doc }]).mockResolvedValueOnce([governedVersion]);
          dbMock.returning.mockResolvedValueOnce([twoVersion]);

          await expect(
            service.updateContent('user-1', 'doc-1', 'version-1', { content: TWO }),
          ).resolves.toBeDefined();
        });
      });

      it('is resolved from the version PIN, never from whatever is published now', async () => {
        // Otherwise a template author could retroactively re-govern documents already authored
        // under an earlier version (doc 221's integration contract).
        govern(undefined);
        dbMock.limit.mockResolvedValueOnce([{ doc }]).mockResolvedValueOnce([governedVersion]);
        dbMock.returning.mockResolvedValueOnce([governedVersion]);

        await service.updateContent('user-1', 'doc-1', 'version-1', { content: relabelled });

        expect(templatesMock.capabilitiesForVersion).toHaveBeenCalledWith(
          version.templateVersionId,
        );
        expect(templatesMock.forCreate).not.toHaveBeenCalled();
      });
    });

    it('throws NotFoundException if the version is not found', async () => {
      dbMock.limit.mockResolvedValueOnce([{ doc }]).mockResolvedValueOnce([]);

      await expect(service.updateContent('user-1', 'doc-1', 'version-1', input)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException if the version is not a draft', async () => {
      dbMock.limit
        .mockResolvedValueOnce([{ doc }])
        .mockResolvedValueOnce([{ ...version, status: 'published' }]);

      await expect(service.updateContent('user-1', 'doc-1', 'version-1', input)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws NotFoundException if the update returns no row', async () => {
      dbMock.limit.mockResolvedValueOnce([{ doc }]).mockResolvedValueOnce([version]);
      dbMock.returning.mockResolvedValueOnce([]);

      await expect(service.updateContent('user-1', 'doc-1', 'version-1', input)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

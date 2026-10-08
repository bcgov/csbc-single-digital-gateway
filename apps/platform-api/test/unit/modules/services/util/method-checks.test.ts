import type { Document, DocumentVersion } from '@repo/database';
import { describe, expect, it } from 'vitest';
import {
  methodProblems,
  publishRefusal,
  versionFor,
} from '../../../../../src/modules/services/util/method-checks';

const METHOD_DOC = {
  id: 'm1',
  workspaceId: 'ws-1',
  type: 'services.service-application-method',
  kind: 'document',
  templateId: 't1',
  templateKind: 'template',
  createdAt: new Date('2026-10-01T00:00:00.000Z'),
  updatedAt: new Date('2026-10-01T00:00:00.000Z'),
} as unknown as Document;

const field = { type: 'Control', scope: '#/properties/name' };
const content = (
  root: Record<string, unknown>,
  properties: Record<string, unknown> = { name: { type: 'string' } },
) => ({
  schema: { type: 'object', properties },
  variants: { default: root },
});
const at = (iso: string) => new Date(iso);
const version = (over: Partial<DocumentVersion> = {}): DocumentVersion =>
  ({
    id: 'mv1',
    documentId: 'm1',
    templateId: 't1',
    templateVersionId: null,
    versionNumber: 1,
    revision: 1,
    status: 'draft',
    title: 'Apply online',
    description: null,
    content: content({ type: 'Form', label: 'Apply online', elements: [field] }),
    createdAt: at('2026-10-01T00:00:00.000Z'),
    publishedAt: null,
    archivedAt: null,
    ...over,
  }) as DocumentVersion;

// Doc 289 rules 3-5: the problems of one application method version.
describe('methodProblems (doc 289 rules 3-5)', () => {
  describe('problems', () => {
    it('returns [] for a titled, valid method with a bound field', () => {
      expect(methodProblems(METHOD_DOC, version())).toEqual([]);
      // A Funnel's Forms count (rule 5).
      const funnel = content({
        type: 'Funnel',
        label: 'Apply in steps',
        elements: [{ type: 'Form', elements: [{ type: 'VerticalLayout', elements: [field] }] }],
      });
      expect(methodProblems(METHOD_DOC, version({ content: funnel }))).toEqual([]);
    });

    it('reports Has no title for a missing or blank default label', () => {
      expect(
        methodProblems(
          METHOD_DOC,
          version({ content: content({ type: 'Form', elements: [field] }) }),
        ),
      ).toEqual(['Has no title']);
      expect(
        methodProblems(
          METHOD_DOC,
          version({ content: content({ type: 'Form', label: '   ', elements: [field] }) }),
        ),
      ).toEqual(['Has no title']);
    });

    it('reports Has no fields when the default variant binds no property (Funnel Forms counted)', () => {
      const empty = content({ type: 'Form', label: 'A', elements: [{ type: 'Heading' }] });
      expect(methodProblems(METHOD_DOC, version({ content: empty }))).toEqual(['Has no fields']);
      // A Control whose property the schema doesn't declare is not a field.
      const dangling = content({ type: 'Form', label: 'A', elements: [field] }, {});
      expect(methodProblems(METHOD_DOC, version({ content: dangling }))).toEqual(['Has no fields']);
      // Both problems together.
      const bare = content({ type: 'Funnel', elements: [{ type: 'Form', elements: [] }] });
      expect(methodProblems(METHOD_DOC, version({ content: bare }))).toEqual([
        'Has no title',
        'Has no fields',
      ]);
    });

    it('reports the validateContent message for invalid content', () => {
      const [problem, ...rest] = methodProblems(METHOD_DOC, version({ content: { schema: 1 } }));
      expect(problem).toEqual(expect.any(String));
      expect(problem!.length).toBeGreaterThan(0);
      expect(rest).toEqual([]);
      // A root the application-method type does not allow.
      const wrongRoot = methodProblems(
        METHOD_DOC,
        version({ content: content({ type: 'VerticalLayout', label: 'A', elements: [field] }) }),
      );
      expect(wrongRoot[0]).toContain('root must be');
    });
  });
});

// Doc 289 rule 15.
describe('versionFor (doc 289 rule 15)', () => {
  const v1 = version({
    id: 'a',
    versionNumber: 1,
    status: 'archived',
    publishedAt: at('2026-10-02T00:00:00.000Z'),
    archivedAt: at('2026-10-05T00:00:00.000Z'),
  });
  const v2 = version({
    id: 'b',
    versionNumber: 2,
    status: 'published',
    publishedAt: at('2026-10-05T00:00:00.000Z'),
  });
  const v3 = version({ id: 'c', versionNumber: 3, status: 'draft' });

  it('uses the latest for a draft, the published for a published, and the then-published for an archived service version', () => {
    expect(versionFor({ status: 'draft', archivedAt: null }, [v2, v1, v3])?.id).toBe('c');
    expect(versionFor({ status: 'published', archivedAt: null }, [v1, v2, v3])?.id).toBe('b');
    expect(
      versionFor({ status: 'archived', archivedAt: at('2026-10-04T00:00:00.000Z') }, [v1, v2, v3])
        ?.id,
    ).toBe('a');
    expect(
      versionFor({ status: 'archived', archivedAt: at('2026-10-06T00:00:00.000Z') }, [v1, v2, v3])
        ?.id,
    ).toBe('b');
  });

  it('falls back to the latest non-draft, then the latest, and is undefined without versions', () => {
    expect(versionFor({ status: 'published', archivedAt: null }, [v3])?.id).toBe('c');
    expect(
      versionFor({ status: 'archived', archivedAt: at('2026-09-01T00:00:00.000Z') }, [v1, v3])?.id,
    ).toBe('a');
    expect(versionFor({ status: 'draft', archivedAt: null }, [])).toBeUndefined();
  });
});

describe('publishRefusal (doc 289 rule 7)', () => {
  it('is undefined only when there are methods and none has problems', () => {
    expect(publishRefusal({ ok: false, hasMethods: false, methods: [] })).toBe(
      'Add at least one application method',
    );
    expect(
      publishRefusal({
        ok: true,
        hasMethods: true,
        methods: [{ id: 'm1', title: 'A', status: 'draft', problems: [] }],
      }),
    ).toBeUndefined();
  });
});

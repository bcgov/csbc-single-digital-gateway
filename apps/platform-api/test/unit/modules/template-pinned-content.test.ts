import { describe, expect, it } from 'vitest';
import { toContent } from '../../../src/modules/templates/services/template.resolver';
import { serviceAgreementDetailSchema } from '../../../src/modules/service-agreements/dtos/service-agreement.dtos';
import { formWithVersionSchema } from '../../../src/modules/forms/dtos/form.dtos';
import { definitionSchema } from '../../../src/modules/services/dtos/service.dtos';

// Doc 221 — every READ path resolves a document's template by its PINNED version.
//
// TWO DEFECTS this file exists for:
//
// 1. `toContent` split the jsonb into `{schema, uischema}` and DISCARDED every other key — so a
//    capability map would be lost one layer BELOW the DTO, the same silent-drop shape doc 220 found
//    in zod's `z.object`.
//
// 2. `service-agreements.service.ts` built its detail `definition` from `templates.resolve(TYPE)` —
//    the currently-PUBLISHED template — on a READ path. The resolver's own comment says why that is
//    wrong, and since doc 220 it would also let a template author retroactively re-govern documents
//    already built from an earlier version, contradicting "capability changes take effect only on
//    re-pin".

const UUID = 'e6005cbb-84f9-467a-bb48-e8cbffc9c991';
const CAPABILITIES = {
  default: { '*': { edit: 'none', remove: false } },
  elements: { a1b2c3d4: { edit: 'all' } },
};

describe('toContent carries capabilities', () => {
  it('keeps a capabilities key instead of discarding it', () => {
    const content = toContent({
      schema: { type: 'object' },
      uischema: { type: 'Form' },
      capabilities: CAPABILITIES,
    });
    expect(content.capabilities).toEqual(CAPABILITIES);
  });

  it('tolerates content with no capabilities key', () => {
    const content = toContent({ schema: { type: 'object' }, uischema: { type: 'Form' } });
    expect(content.capabilities).toBeUndefined();
    expect(content.schema).toEqual({ type: 'object' });
  });

  it('leaves the key ABSENT rather than explicitly undefined (exactOptionalPropertyTypes)', () => {
    // A host spreading this must not create a `capabilities: undefined` it then saves.
    expect(Object.hasOwn(toContent({ schema: {}, uischema: {} }), 'capabilities')).toBe(false);
  });

  it('ignores a capabilities value that is not a plain object', () => {
    for (const bad of ['all', 42, [], null]) {
      expect(
        toContent({ schema: {}, uischema: {}, capabilities: bad }).capabilities,
      ).toBeUndefined();
    }
  });

  it('still tolerates null content entirely', () => {
    expect(toContent(null)).toEqual({ schema: {}, uischema: {} });
    expect(toContent(undefined)).toEqual({ schema: {}, uischema: {} });
  });
});

describe('the DTOs carry the pinned template through', () => {
  it('a service-agreement version names the template version it is pinned to', () => {
    const parsed = serviceAgreementDetailSchema.parse({
      agreement: {
        id: UUID,
        workspaceId: null,
        title: 'Terms',
        type: 'service-agreement',
        createdAt: '2026-07-28T12:00:00.000Z',
        updatedAt: '2026-07-28T12:00:00.000Z',
      },
      // Doc 225 rule 7: the detail always says what may be deleted.
      deletable: { agreement: true, versionIds: [] },
      versions: [
        {
          id: UUID,
          versionNumber: 1,
          revision: 1,
          status: 'draft',
          title: 'Terms',
          description: null,
          content: {},
          templateVersionId: UUID,
          createdAt: '2026-07-28T12:00:00.000Z',
          publishedAt: null,
          archivedAt: null,
        },
      ],
      definitions: { [UUID]: { schema: {}, uischema: {}, capabilities: CAPABILITIES } },
    });
    // The client looks its OWN version's template up, rather than being handed one template.
    expect(parsed.versions[0]?.templateVersionId).toBe(UUID);
    expect(parsed.definitions[UUID]?.capabilities).toEqual(CAPABILITIES);
  });

  it('service-agreement definitions are keyed by template version, not a single definition', () => {
    // Feature 174's shape: a document's versions may span more than one template version.
    expect(serviceAgreementDetailSchema.shape.definitions).toBeDefined();
    expect('definition' in serviceAgreementDetailSchema.shape).toBe(false);
  });

  it('a form version carries its pinned definition, capabilities and all', () => {
    const parsed = formWithVersionSchema.parse({
      form: {
        id: UUID,
        workspaceId: UUID,
        title: 'A form',
        type: 'application-method',
        createdAt: '2026-07-28T12:00:00.000Z',
      },
      version: {
        id: UUID,
        documentId: UUID,
        versionNumber: 1,
        revision: 1,
        status: 'draft',
        title: 'A form',
        description: null,
        content: {},
        createdAt: '2026-07-28T12:00:00.000Z',
      },
      definition: { schema: {}, uischema: {}, capabilities: CAPABILITIES },
    });
    expect(parsed.definition?.capabilities).toEqual(CAPABILITIES);
  });

  it('a form version pinned to nothing simply has no definition', () => {
    const parsed = formWithVersionSchema.parse({
      form: {
        id: UUID,
        workspaceId: UUID,
        title: 'A form',
        type: 'application-method',
        createdAt: '2026-07-28T12:00:00.000Z',
      },
      version: {
        id: UUID,
        documentId: UUID,
        versionNumber: 1,
        revision: 1,
        status: 'draft',
        title: 'A form',
        description: null,
        content: {},
        createdAt: '2026-07-28T12:00:00.000Z',
      },
    });
    expect(parsed.definition).toBeUndefined();
  });

  it("a service's definition schema carries capabilities too, so all three types agree", () => {
    expect(
      definitionSchema.parse({ schema: {}, uischema: {}, capabilities: CAPABILITIES }),
    ).toHaveProperty('capabilities');
    // Absent stays absent — a template with no map governs nothing.
    expect(definitionSchema.parse({ schema: {}, uischema: {} }).capabilities).toBeUndefined();
  });

  it('refuses a capabilities value that is not an object, at the DTO boundary', () => {
    expect(
      definitionSchema.safeParse({ schema: {}, uischema: {}, capabilities: 'all' }).success,
    ).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import {
  addReferenceSchema,
  createReferencedFormSchema,
  externalApplicationSchema,
} from '../src/modules/services/dtos/reference.dtos';

const UUID = '11111111-1111-4111-8111-111111111111';

describe('reference DTO schemas', () => {
  it('addReferenceSchema requires a uuid target and a known relation', () => {
    expect(
      addReferenceSchema.safeParse({ targetVersionId: UUID, relation: 'application_form' }).success,
    ).toBe(true);
    expect(
      addReferenceSchema.safeParse({ targetVersionId: UUID, relation: 'related_service' }).success,
    ).toBe(true);
    expect(addReferenceSchema.safeParse({ targetVersionId: UUID, relation: 'other' }).success).toBe(
      false,
    );
    expect(
      addReferenceSchema.safeParse({ targetVersionId: 'nope', relation: 'application_form' })
        .success,
    ).toBe(false);
  });

  it('createReferencedFormSchema requires a uuid typeId and a non-empty title', () => {
    expect(createReferencedFormSchema.safeParse({ typeId: UUID, title: 'Apply' }).success).toBe(
      true,
    );
    expect(createReferencedFormSchema.safeParse({ typeId: UUID, title: '' }).success).toBe(false);
    expect(createReferencedFormSchema.safeParse({ typeId: 'nope', title: 'Apply' }).success).toBe(
      false,
    );
  });

  it('externalApplicationSchema requires a label and an https url (feature 131)', () => {
    expect(
      externalApplicationSchema.safeParse({
        label: 'Apply on GOV',
        url: 'https://gov.example/apply',
      }).success,
    ).toBe(true);
    // Non-https, script scheme, relative, and empty are all rejected.
    expect(
      externalApplicationSchema.safeParse({ label: 'x', url: 'http://gov.example' }).success,
    ).toBe(false);
    expect(
      externalApplicationSchema.safeParse({ label: 'x', url: 'javascript:alert(1)' }).success,
    ).toBe(false);
    expect(externalApplicationSchema.safeParse({ label: 'x', url: '/relative' }).success).toBe(
      false,
    );
    expect(
      externalApplicationSchema.safeParse({ label: '', url: 'https://gov.example' }).success,
    ).toBe(false);
  });
});

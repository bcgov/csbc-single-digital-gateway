import { describe, expect, it } from 'vitest';
import {
  addReferenceSchema,
  createReferencedFormSchema,
  externalApplicationSchema,
} from '../../../../../src/modules/services/dtos/reference.dtos';
import { UUID } from '../../../../utils/fixtures';

describe('reference DTO schemas', () => {
  it('Should require a uuid target and a known relation in addReferenceSchema', () => {
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

  it('Should require a uuid typeId and a non-empty title in createReferencedFormSchema', () => {
    expect(createReferencedFormSchema.safeParse({ typeId: UUID, title: 'Apply' }).success).toBe(
      true,
    );
    expect(createReferencedFormSchema.safeParse({ typeId: UUID, title: '' }).success).toBe(false);
    expect(createReferencedFormSchema.safeParse({ typeId: 'nope', title: 'Apply' }).success).toBe(
      false,
    );
  });

  it('Should require a label and an https url in externalApplicationSchema (feature 131)', () => {
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

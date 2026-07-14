import { describe, expect, it } from 'vitest';
import {
  addReferenceSchema,
  createReferencedFormSchema,
} from '../../../../../src/modules/services/dtos/reference.dtos';

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
});

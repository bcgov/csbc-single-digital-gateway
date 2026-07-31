import { describe, expect, it } from 'vitest';
import {
  recordConsentSchema,
  serviceAgreementConsentSchema,
} from '../../../../../src/modules/applications/dtos/consent.dtos';

const UUID = '11111111-1111-4111-8111-111111111111';

describe('consent DTO schemas', () => {
  it('record: requires a uuid agreementVersionId + an approve/reject decision', () => {
    expect(
      recordConsentSchema.safeParse({ agreementVersionId: UUID, decision: 'approve' }).success,
    ).toBe(true);
    expect(
      recordConsentSchema.safeParse({ agreementVersionId: UUID, decision: 'reject' }).success,
    ).toBe(true);
    expect(recordConsentSchema.safeParse({}).success).toBe(false);
    expect(
      recordConsentSchema.safeParse({ agreementVersionId: 'nope', decision: 'approve' }).success,
    ).toBe(false);
    expect(
      recordConsentSchema.safeParse({ agreementVersionId: UUID, decision: 'maybe' }).success,
    ).toBe(false);
  });

  it('surface item: decision is nullable (undecided) and data is preserved', () => {
    expect(
      serviceAgreementConsentSchema.safeParse({
        agreementVersionId: 'v1',
        agreementDocumentId: 'a1',
        data: { title: 'Terms', isOptional: false },
        decision: null,
      }).success,
    ).toBe(true);
    expect(
      serviceAgreementConsentSchema.safeParse({
        agreementVersionId: 'v1',
        agreementDocumentId: 'a1',
        data: {},
        decision: 'approve',
      }).success,
    ).toBe(true);
  });
});

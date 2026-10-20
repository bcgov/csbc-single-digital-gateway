import { describe, expect, it } from 'vitest';
import {
  recordConsentSchema,
  serviceAgreementConsentSchema,
} from '../../../../../src/modules/applications/dtos/consent.dtos';
import { UUID } from '../../../../utils/fixtures';

describe('consent DTO schemas', () => {
  it('Should require a uuid agreementVersionId and an approve/reject decision for record', () => {
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

  it('Should allow nullable decision (undecided) and preserve data for surface item', () => {
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

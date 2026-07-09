import { describe, expect, it } from 'vitest';
import {
  attachAgreementSchema,
  agreementRefSchema,
} from '../src/modules/services/dtos/agreement-ref.dtos';

const UUID = '11111111-1111-4111-8111-111111111111';

describe('agreement reference DTO schemas', () => {
  it('attach requires a uuid agreementDocumentId', () => {
    expect(attachAgreementSchema.safeParse({ agreementDocumentId: UUID }).success).toBe(true);
    expect(attachAgreementSchema.safeParse({}).success).toBe(false);
    expect(attachAgreementSchema.safeParse({ agreementDocumentId: 'nope' }).success).toBe(false);
  });

  it('the response schema round-trips a resolved reference', () => {
    const parsed = agreementRefSchema.safeParse({
      id: 'ref1',
      agreementDocumentId: 'a1',
      agreementVersionId: 'v1',
      title: 'Terms of service',
      isOptional: false,
      isGlobal: true,
      position: 0,
      createdAt: '2026-07-08T00:00:00.000Z',
    });
    expect(parsed.success).toBe(true);
  });
});

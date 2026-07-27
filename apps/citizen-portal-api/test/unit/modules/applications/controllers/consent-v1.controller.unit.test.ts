import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '@repo/nestjs/auth';
import { ConsentV1Controller } from '../../../../../src/modules/applications/controllers/consent-v1.controller';
import { ConsentService } from '../../../../../src/modules/applications/services/consent.service';
import type { ConsentDecision } from '../../../../../src/modules/applications/dtos/consent.dtos';

describe('ConsentV1Controller Unit Tests', () => {
  let controller: ConsentV1Controller;
  let consentServiceMock: any;

  beforeEach(() => {
    consentServiceMock = {
      agreementsForService: vi.fn(),
      record: vi.fn(),
    };
    controller = new ConsentV1Controller(consentServiceMock as unknown as ConsentService);
  });

  describe('agreements', () => {
    it('should call agreementsForService on ConsentService with user ID and service ID', async () => {
      const user = { id: 'user-1' } as AuthUser;
      const serviceId = 'svc-1';
      const expectedItems = [
        {
          agreementVersionId: 'ver-1',
          agreementDocumentId: 'doc-1',
          data: { title: 'Agreement 1' },
          decision: 'approve' as ConsentDecision,
        },
      ];

      consentServiceMock.agreementsForService.mockResolvedValue(expectedItems);

      const result = await controller.agreements(user, serviceId);

      expect(consentServiceMock.agreementsForService).toHaveBeenCalledWith('user-1', 'svc-1');
      expect(result).toEqual({ items: expectedItems });
    });
  });

  describe('record', () => {
    it('should call record on ConsentService with user ID, agreementVersionId, and decision', async () => {
      const user = { id: 'user-1' } as AuthUser;
      const body = {
        agreementVersionId: 'ver-1',
        decision: 'approve' as ConsentDecision,
      };
      const expectedResult = {
        agreementVersionId: 'ver-1',
        decision: 'approve' as ConsentDecision,
      };

      consentServiceMock.record.mockResolvedValue(expectedResult);

      const result = await controller.record(user, body);

      expect(consentServiceMock.record).toHaveBeenCalledWith('user-1', 'ver-1', 'approve');
      expect(result).toEqual(expectedResult);
    });
  });
});

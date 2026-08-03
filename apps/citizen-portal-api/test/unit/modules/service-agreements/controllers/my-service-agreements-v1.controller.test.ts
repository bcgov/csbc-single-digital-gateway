import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MyServiceAgreementsV1Controller } from '../../../../../src/modules/service-agreements/controllers/my-service-agreements-v1.controller';
import { ServiceAgreementsService } from '../../../../../src/modules/service-agreements/services/service-agreements.service';
import type { AuthUser } from '@repo/nestjs/auth';

describe('MyServiceAgreementsV1Controller Unit Test Suite', () => {
  let controller: MyServiceAgreementsV1Controller;
  let serviceMock: any;

  const mockUser = { id: 'user-123' } as unknown as AuthUser;

  beforeEach(() => {
    serviceMock = {
      listMine: vi.fn(),
      getMine: vi.fn(),
    };
    controller = new MyServiceAgreementsV1Controller(
      serviceMock as unknown as ServiceAgreementsService,
    );
  });

  describe('list', () => {
    it('should return service agreements list for current user', async () => {
      const mockAgreements = [
        {
          id: 'agreement-id-1',
          agreementDocumentId: 'doc-id-1',
          title: 'Terms of Service',
          consentedAt: '2026-07-31T20:34:51.000Z',
        },
      ];
      serviceMock.listMine.mockResolvedValue(mockAgreements);

      const result = await controller.list(mockUser);

      expect(serviceMock.listMine).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({ items: mockAgreements });
    });
  });

  describe('get', () => {
    it('should return a specific service agreement detail for current user', async () => {
      const consentId = 'consent-uuid';
      const mockDetail = {
        id: consentId,
        agreementDocumentId: 'doc-id-1',
        title: 'Terms of Service',
        description: 'Description of terms',
        content: 'Content here',
        decision: 'approve' as const,
        approveLabel: 'Approve',
        rejectLabel: 'Reject',
        consentedAt: '2026-07-31T20:34:51.000Z',
      };
      serviceMock.getMine.mockResolvedValue(mockDetail);

      const result = await controller.get(mockUser, consentId);

      expect(serviceMock.getMine).toHaveBeenCalledWith('user-123', consentId);
      expect(result).toEqual(mockDetail);
    });
  });
});

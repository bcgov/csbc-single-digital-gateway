import { UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { MyApplicationsV1Controller } from '../my-applications-v1.controller';

describe('MyApplicationsV1Controller', () => {
  let controller: MyApplicationsV1Controller;
  let applicationsService: { listForUser: jest.Mock };

  const mockReq = (userId?: string): Request =>
    ({
      session: {
        bcsc: userId !== undefined ? { userId, userProfile: {} } : undefined,
      },
    }) as unknown as Request;

  beforeEach(() => {
    applicationsService = {
      listForUser: jest.fn().mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
      }),
    };
    controller = new MyApplicationsV1Controller(applicationsService as never);
  });

  describe('GET /me/applications', () => {
    it('should delegate to ApplicationsService.listForUser with session userId and page/limit query (no serviceId)', async () => {
      await controller.listForUser({ page: 1, limit: 20 }, mockReq('user-abc'));

      expect(applicationsService.listForUser).toHaveBeenCalledWith({
        userId: 'user-abc',
        page: 1,
        limit: 20,
      });
      const call = applicationsService.listForUser.mock.calls[0][0];
      expect(call).not.toHaveProperty('serviceId');
    });

    it('should pass page=1 and limit=20 through when the Zod defaults are applied', async () => {
      await controller.listForUser({ page: 1, limit: 20 }, mockReq('user-abc'));

      const call = applicationsService.listForUser.mock.calls[0][0];
      expect(call.page).toBe(1);
      expect(call.limit).toBe(20);
    });

    it('should pass a provided page and limit query param through to the service', async () => {
      await controller.listForUser({ page: 4, limit: 25 }, mockReq('user-abc'));

      const call = applicationsService.listForUser.mock.calls[0][0];
      expect(call.page).toBe(4);
      expect(call.limit).toBe(25);
    });

    it('should throw UnauthorizedException when no session userId is present', async () => {
      await expect(
        controller.listForUser({ page: 1, limit: 20 }, mockReq(undefined)),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(applicationsService.listForUser).not.toHaveBeenCalled();
    });

    it('should propagate the paginated envelope returned by the service as the response body', async () => {
      const envelope = {
        items: [{ id: 'row-1', serviceTitle: 'T', serviceApplicationTitle: 'A' }],
        total: 1,
        page: 1,
        limit: 20,
      };
      applicationsService.listForUser.mockResolvedValueOnce(envelope);

      const result = await controller.listForUser(
        { page: 1, limit: 20 },
        mockReq('user-abc'),
      );

      expect(result).toBe(envelope);
    });

    it('should propagate errors thrown by the service without swallowing them', async () => {
      applicationsService.listForUser.mockRejectedValueOnce(new Error('boom'));

      await expect(
        controller.listForUser({ page: 1, limit: 20 }, mockReq('user-abc')),
      ).rejects.toThrow('boom');
    });
  });
});

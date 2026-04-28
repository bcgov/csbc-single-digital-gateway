import { UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { ApplicationsV1Controller } from '../applications-v1.controller';

describe('ApplicationsV1Controller', () => {
  let controller: ApplicationsV1Controller;
  let applicationsService: { submit: jest.Mock; listForUser: jest.Mock };

  const PARAMS = {
    serviceId: '11111111-1111-4111-8111-111111111111',
    versionId: '22222222-2222-4222-8222-222222222222',
    applicationId: '33333333-3333-4333-8333-333333333333',
  };

  const SERVICE_PARAM = { serviceId: PARAMS.serviceId };

  const mockReq = (
    userId?: string,
    profile?: Record<string, unknown>,
  ): Request =>
    ({
      session: {
        bcsc:
          userId !== undefined || profile !== undefined
            ? { userId, userProfile: profile }
            : undefined,
      },
    }) as unknown as Request;

  const fullSessionReq = () =>
    mockReq('user-abc', {
      sub: 'abc123@bcsc',
      name: 'Jane Doe',
      given_name: 'Jane',
      family_name: 'Doe',
    });

  beforeEach(() => {
    applicationsService = {
      submit: jest.fn().mockResolvedValue({}),
      listForUser: jest.fn().mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
      }),
    };
    controller = new ApplicationsV1Controller(applicationsService as never);
  });

  describe('POST /services/:serviceId/versions/:versionId/apply/:applicationId', () => {
    it('should delegate to ApplicationsService.submit with path params, session userId, session userProfile, and locale', async () => {
      await controller.submit(PARAMS, { locale: 'en' }, fullSessionReq());
      expect(applicationsService.submit).toHaveBeenCalledWith({
        serviceId: PARAMS.serviceId,
        versionId: PARAMS.versionId,
        applicationId: PARAMS.applicationId,
        locale: 'en',
        userId: 'user-abc',
        profile: {
          sub: 'abc123@bcsc',
          name: 'Jane Doe',
          given_name: 'Jane',
          family_name: 'Doe',
        },
      });
    });

    it('should default locale to "en" when no locale query param is provided', async () => {
      // Zod applies the default at the controller-validation layer, so the
      // controller always receives `locale` populated. This test verifies that
      // the controller passes through whatever locale it receives without
      // substituting its own default.
      await controller.submit(PARAMS, { locale: 'en' }, fullSessionReq());
      const call = applicationsService.submit.mock.calls[0][0];
      expect(call.locale).toBe('en');
    });

    it('should pass the provided locale query param through to the service', async () => {
      await controller.submit(PARAMS, { locale: 'fr' }, fullSessionReq());
      const call = applicationsService.submit.mock.calls[0][0];
      expect(call.locale).toBe('fr');
    });

    it('should throw UnauthorizedException when no session userId is present', async () => {
      await expect(
        controller.submit(
          PARAMS as never,
          { locale: 'en' },
          mockReq(undefined, undefined),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(applicationsService.submit).not.toHaveBeenCalled();
    });

    it('should propagate the service result as the response body', async () => {
      const row = { id: 'row-1', serviceApplicationType: 'external' };
      applicationsService.submit.mockResolvedValueOnce(row);

      const result = await controller.submit(
        PARAMS,
        { locale: 'en' },
        fullSessionReq(),
      );

      expect(result).toBe(row);
    });

    it('should propagate errors thrown by the service without swallowing them', async () => {
      applicationsService.submit.mockRejectedValueOnce(new Error('boom'));
      await expect(
        controller.submit(PARAMS as never, { locale: 'en' }, fullSessionReq()),
      ).rejects.toThrow('boom');
    });
  });

  describe('GET /services/:serviceId/applications', () => {
    it('should delegate to ApplicationsService.listForUser with session userId, serviceId path param, and page/limit query', async () => {
      await controller.listForService(
        SERVICE_PARAM,
        { page: 1, limit: 20 },
        fullSessionReq(),
      );

      expect(applicationsService.listForUser).toHaveBeenCalledWith({
        userId: 'user-abc',
        serviceId: PARAMS.serviceId,
        page: 1,
        limit: 20,
      });
    });

    it('should pass page=1 and limit=20 through when the Zod defaults are applied', async () => {
      await controller.listForService(
        SERVICE_PARAM,
        { page: 1, limit: 20 },
        fullSessionReq(),
      );

      const call = applicationsService.listForUser.mock.calls[0][0];
      expect(call.page).toBe(1);
      expect(call.limit).toBe(20);
    });

    it('should pass a provided page and limit query param through to the service', async () => {
      await controller.listForService(
        SERVICE_PARAM,
        { page: 3, limit: 50 },
        fullSessionReq(),
      );

      const call = applicationsService.listForUser.mock.calls[0][0];
      expect(call.page).toBe(3);
      expect(call.limit).toBe(50);
    });

    it('should throw UnauthorizedException when no session userId is present', async () => {
      await expect(
        controller.listForService(
          SERVICE_PARAM,
          { page: 1, limit: 20 },
          mockReq(undefined, undefined),
        ),
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

      const result = await controller.listForService(
        SERVICE_PARAM,
        { page: 1, limit: 20 },
        fullSessionReq(),
      );

      expect(result).toBe(envelope);
    });

    it('should propagate errors thrown by the service without swallowing them', async () => {
      applicationsService.listForUser.mockRejectedValueOnce(new Error('boom'));

      await expect(
        controller.listForService(
          SERVICE_PARAM,
          { page: 1, limit: 20 },
          fullSessionReq(),
        ),
      ).rejects.toThrow('boom');
    });
  });
});

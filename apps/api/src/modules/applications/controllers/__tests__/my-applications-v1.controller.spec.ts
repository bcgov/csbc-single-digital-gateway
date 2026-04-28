import {
  BadGatewayException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { MyApplicationsV1Controller } from '../my-applications-v1.controller';

describe('MyApplicationsV1Controller', () => {
  let controller: MyApplicationsV1Controller;
  let applicationsService: {
    listForUser: jest.Mock;
    findOneForUser: jest.Mock;
    getActorReadContext: jest.Mock;
  };
  let workflowActorClient: {
    fetchActions: jest.Mock;
    fetchMessages: jest.Mock;
  };

  const mockReq = (
    userId?: string,
    profile: Record<string, unknown> | null = {},
  ): Request =>
    ({
      session: {
        bcsc:
          userId !== undefined
            ? profile === null
              ? { userId }
              : { userId, userProfile: profile }
            : undefined,
      },
    }) as unknown as Request;

  const APPLICATION_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
  const PROFILE = { sub: 'abc123@bcsc' };

  beforeEach(() => {
    applicationsService = {
      listForUser: jest.fn().mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
      }),
      findOneForUser: jest.fn(),
      getActorReadContext: jest.fn(),
    };
    workflowActorClient = {
      fetchActions: jest.fn(),
      fetchMessages: jest.fn(),
    };
    controller = new MyApplicationsV1Controller(
      applicationsService as never,
      workflowActorClient as never,
    );
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

  // ---------------------------------------------------------------------------
  // GET /me/applications/:applicationId/actions  (doc 09)
  // ---------------------------------------------------------------------------
  describe('GET /me/applications/:applicationId/actions (doc 09)', () => {
    const ctx = {
      actorId: 'abc123',
      executionId: '197',
      workflowConfig: { apiKey: 'k', tenantId: 't' },
    };
    const envelope = { items: [], nextCursor: null };

    it('throws UnauthorizedException when no BCSC session is present', async () => {
      await expect(
        controller.getActions(
          { applicationId: APPLICATION_ID },
          mockReq(undefined),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(applicationsService.getActorReadContext).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when bcsc.userId is set but userProfile is missing', async () => {
      await expect(
        controller.getActions(
          { applicationId: APPLICATION_ID },
          mockReq('user-abc', null),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(applicationsService.getActorReadContext).not.toHaveBeenCalled();
    });

    it('calls applicationsService.getActorReadContext with { userId, userProfile, applicationId }', async () => {
      applicationsService.getActorReadContext.mockResolvedValue(ctx);
      workflowActorClient.fetchActions.mockResolvedValue(envelope);

      await controller.getActions(
        { applicationId: APPLICATION_ID },
        mockReq('user-abc', PROFILE),
      );

      expect(applicationsService.getActorReadContext).toHaveBeenCalledWith({
        userId: 'user-abc',
        userProfile: PROFILE,
        applicationId: APPLICATION_ID,
      });
    });

    it('passes the resolved context into workflowActorClient.fetchActions', async () => {
      applicationsService.getActorReadContext.mockResolvedValue(ctx);
      workflowActorClient.fetchActions.mockResolvedValue(envelope);

      await controller.getActions(
        { applicationId: APPLICATION_ID },
        mockReq('user-abc', PROFILE),
      );

      expect(workflowActorClient.fetchActions).toHaveBeenCalledWith(ctx);
    });

    it('returns the envelope from workflowActorClient.fetchActions unchanged', async () => {
      applicationsService.getActorReadContext.mockResolvedValue(ctx);
      workflowActorClient.fetchActions.mockResolvedValue(envelope);

      const result = await controller.getActions(
        { applicationId: APPLICATION_ID },
        mockReq('user-abc', PROFILE),
      );

      expect(result).toBe(envelope);
    });

    it('declares Cache-Control: no-store via @Header on the route handler', () => {
      const headers = Reflect.getMetadata(
        '__headers__',
        Object.getPrototypeOf(controller).getActions,
      );
      expect(headers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Cache-Control',
            value: 'no-store',
          }),
        ]),
      );
    });

    it('propagates NotFoundException thrown by getActorReadContext (no swallowing)', async () => {
      applicationsService.getActorReadContext.mockRejectedValue(
        new NotFoundException('Application not found'),
      );

      await expect(
        controller.getActions(
          { applicationId: APPLICATION_ID },
          mockReq('user-abc', PROFILE),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(workflowActorClient.fetchActions).not.toHaveBeenCalled();
    });

    it('propagates BadGatewayException thrown by fetchActions (no swallowing)', async () => {
      applicationsService.getActorReadContext.mockResolvedValue(ctx);
      workflowActorClient.fetchActions.mockRejectedValue(
        new BadGatewayException('Workflow actor read failed'),
      );

      await expect(
        controller.getActions(
          { applicationId: APPLICATION_ID },
          mockReq('user-abc', PROFILE),
        ),
      ).rejects.toBeInstanceOf(BadGatewayException);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /me/applications/:applicationId/messages  (doc 09)
  // ---------------------------------------------------------------------------
  describe('GET /me/applications/:applicationId/messages (doc 09)', () => {
    const ctx = {
      actorId: 'abc123',
      executionId: '197',
      workflowConfig: { apiKey: 'k', tenantId: 't' },
    };
    const envelope = { items: [] };

    it('throws UnauthorizedException when no BCSC session is present', async () => {
      await expect(
        controller.getMessages(
          { applicationId: APPLICATION_ID },
          mockReq(undefined),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(applicationsService.getActorReadContext).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when bcsc.userId is set but userProfile is missing', async () => {
      await expect(
        controller.getMessages(
          { applicationId: APPLICATION_ID },
          mockReq('user-abc', null),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(applicationsService.getActorReadContext).not.toHaveBeenCalled();
    });

    it('calls applicationsService.getActorReadContext with { userId, userProfile, applicationId }', async () => {
      applicationsService.getActorReadContext.mockResolvedValue(ctx);
      workflowActorClient.fetchMessages.mockResolvedValue(envelope);

      await controller.getMessages(
        { applicationId: APPLICATION_ID },
        mockReq('user-abc', PROFILE),
      );

      expect(applicationsService.getActorReadContext).toHaveBeenCalledWith({
        userId: 'user-abc',
        userProfile: PROFILE,
        applicationId: APPLICATION_ID,
      });
    });

    it('passes the resolved context into workflowActorClient.fetchMessages', async () => {
      applicationsService.getActorReadContext.mockResolvedValue(ctx);
      workflowActorClient.fetchMessages.mockResolvedValue(envelope);

      await controller.getMessages(
        { applicationId: APPLICATION_ID },
        mockReq('user-abc', PROFILE),
      );

      expect(workflowActorClient.fetchMessages).toHaveBeenCalledWith(ctx);
    });

    it('returns the envelope from workflowActorClient.fetchMessages unchanged (already wrapped as { items })', async () => {
      applicationsService.getActorReadContext.mockResolvedValue(ctx);
      workflowActorClient.fetchMessages.mockResolvedValue(envelope);

      const result = await controller.getMessages(
        { applicationId: APPLICATION_ID },
        mockReq('user-abc', PROFILE),
      );

      expect(result).toBe(envelope);
    });

    it('declares Cache-Control: no-store via @Header on the route handler', () => {
      const headers = Reflect.getMetadata(
        '__headers__',
        Object.getPrototypeOf(controller).getMessages,
      );
      expect(headers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Cache-Control',
            value: 'no-store',
          }),
        ]),
      );
    });

    it('propagates NotFoundException thrown by getActorReadContext (no swallowing)', async () => {
      applicationsService.getActorReadContext.mockRejectedValue(
        new NotFoundException('Application not found'),
      );

      await expect(
        controller.getMessages(
          { applicationId: APPLICATION_ID },
          mockReq('user-abc', PROFILE),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(workflowActorClient.fetchMessages).not.toHaveBeenCalled();
    });

    it('propagates BadGatewayException thrown by fetchMessages (no swallowing)', async () => {
      applicationsService.getActorReadContext.mockResolvedValue(ctx);
      workflowActorClient.fetchMessages.mockRejectedValue(
        new BadGatewayException('Workflow actor read failed'),
      );

      await expect(
        controller.getMessages(
          { applicationId: APPLICATION_ID },
          mockReq('user-abc', PROFILE),
        ),
      ).rejects.toBeInstanceOf(BadGatewayException);
    });
  });
});

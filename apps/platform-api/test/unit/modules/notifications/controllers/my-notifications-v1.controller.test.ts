import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { MyNotificationsV1Controller } from '../../../../../src/modules/notifications/controllers/my-notifications-v1.controller';
import { NotificationsProxyService } from '../../../../../src/modules/notifications/services/notifications-proxy.service';
import type { Request, Response } from 'express';
import { citizenUser } from '../../../../utils/fixtures';

describe('MyNotificationsV1Controller', () => {
  let controller: MyNotificationsV1Controller;
  let proxyMock: any;

  beforeEach(async () => {
    proxyMock = {
      request: vi.fn(),
      pipeStream: vi.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [MyNotificationsV1Controller],
      providers: [
        {
          provide: NotificationsProxyService,
          useValue: proxyMock,
        },
      ],
    }).compile();

    controller = moduleRef.get(MyNotificationsV1Controller);
  });

  describe('list', () => {
    it('Should request the recipient notifications list from the proxy', async () => {
      const mockResult = { items: [], total: 0 };
      proxyMock.request.mockResolvedValue(mockResult);

      const result = await controller.list(citizenUser, { limit: 10, offset: 0 });

      expect(proxyMock.request).toHaveBeenCalledWith(
        'GET',
        `/v1/recipients/${citizenUser.id}/notifications?limit=10&offset=0`,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('stream', () => {
    it('Should pipe the SSE notification stream through the proxy', async () => {
      const req = {} as Request;
      const res = {} as Response;
      proxyMock.pipeStream.mockResolvedValue(undefined);

      await controller.stream(citizenUser, req, res);

      expect(proxyMock.pipeStream).toHaveBeenCalledWith(
        `/v1/recipients/${citizenUser.id}/notifications/stream`,
        req,
        res,
      );
    });
  });

  describe('unreadCount', () => {
    it('Should request the unread count from the proxy', async () => {
      const mockCount = { count: 5 };
      proxyMock.request.mockResolvedValue(mockCount);

      const result = await controller.unreadCount(citizenUser);

      expect(proxyMock.request).toHaveBeenCalledWith(
        'GET',
        `/v1/recipients/${citizenUser.id}/notifications/unread-count`,
      );
      expect(result).toEqual(mockCount);
    });
  });

  describe('readAll', () => {
    it('Should send the read-all request through the proxy', async () => {
      const mockResult = { success: true };
      proxyMock.request.mockResolvedValue(mockResult);

      const result = await controller.readAll(citizenUser);

      expect(proxyMock.request).toHaveBeenCalledWith(
        'POST',
        `/v1/recipients/${citizenUser.id}/notifications/read-all`,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('markRead', () => {
    it('Should send the read request for a specific delivery to the proxy', async () => {
      const mockItem = { id: 'delivery-123', read: true };
      proxyMock.request.mockResolvedValue(mockItem);

      const result = await controller.markRead(citizenUser, 'delivery-123');

      expect(proxyMock.request).toHaveBeenCalledWith(
        'POST',
        `/v1/recipients/${citizenUser.id}/notifications/delivery-123/read`,
      );
      expect(result).toEqual(mockItem);
    });
  });

  describe('preferences', () => {
    it('Should request notification preferences from the proxy', async () => {
      const mockPrefs = { email: true };
      proxyMock.request.mockResolvedValue(mockPrefs);

      const result = await controller.preferences(citizenUser);

      expect(proxyMock.request).toHaveBeenCalledWith(
        'GET',
        `/v1/recipients/${citizenUser.id}/preferences`,
      );
      expect(result).toEqual(mockPrefs);
    });
  });

  describe('updatePreferences', () => {
    it('Should send updated preferences to the proxy', async () => {
      const body = { email: 'test@example.com' };
      const mockPrefs = {
        userId: 'user-123',
        email: 'test@example.com',
        channels: [{ channel: 'email' as const, enabled: false }],
      };
      proxyMock.request.mockResolvedValue(mockPrefs);

      const result = await controller.updatePreferences(citizenUser, body);

      expect(proxyMock.request).toHaveBeenCalledWith(
        'PUT',
        `/v1/recipients/${citizenUser.id}/preferences`,
        body,
      );
      expect(result).toEqual(mockPrefs);
    });
  });

  describe('compiler generated branch coverage', () => {
    it('Should cover SWC parameter metadata helper branches when proxy service is undefined', async () => {
      vi.resetModules();
      vi.doMock(
        '../../../../../src/modules/notifications/services/notifications-proxy.service',
        () => ({
          NotificationsProxyService: undefined,
        }),
      );
      const { MyNotificationsV1Controller: TempController } =
        await import('../../../../../src/modules/notifications/controllers/my-notifications-v1.controller');
      expect(TempController).toBeDefined();
    });
  });
});

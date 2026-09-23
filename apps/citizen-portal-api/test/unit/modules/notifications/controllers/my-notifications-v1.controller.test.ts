import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MyNotificationsV1Controller } from '../../../../../src/modules/notifications/controllers/my-notifications-v1.controller';
import { NotificationsProxyService } from '../../../../../src/modules/notifications/services/notifications-proxy.service';
import type {
  FeedQueryDto,
  UpdatePreferencesDto,
} from '../../../../../src/modules/notifications/dtos/notification.dtos';
import { createMockUser } from '../../../../utils/createMockUser';
import { createMockReq } from '../../../../utils/createMockReq';
import { createMockRes } from '../../../../utils/createMockRes';

describe('MyNotificationsV1Controller Unit Test Suite', () => {
  let controller: MyNotificationsV1Controller;
  let notificationsProxyServiceMock: any;

  const mockUser = createMockUser();

  beforeEach(() => {
    notificationsProxyServiceMock = {
      request: vi.fn(),
      pipeStream: vi.fn(),
    };
    controller = new MyNotificationsV1Controller(
      notificationsProxyServiceMock as unknown as NotificationsProxyService,
    );
  });

  describe('list', () => {
    it('Should list notifications for the current user with limit and offset', async () => {
      const query: FeedQueryDto = { limit: 10, offset: 0 };
      const mockResult = { items: [], total: 0 };
      notificationsProxyServiceMock.request.mockResolvedValue(mockResult);

      const result = await controller.list(mockUser, query);

      expect(notificationsProxyServiceMock.request).toHaveBeenCalledWith(
        'GET',
        '/v1/recipients/user-123/notifications?limit=10&offset=0',
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('stream', () => {
    it('Should pipe stream to response', async () => {
      const mockReq = createMockReq();
      const mockRes = createMockRes();
      notificationsProxyServiceMock.pipeStream.mockResolvedValue(undefined);

      await controller.stream(mockUser, mockReq, mockRes);

      expect(notificationsProxyServiceMock.pipeStream).toHaveBeenCalledWith(
        '/v1/recipients/user-123/notifications/stream',
        mockReq,
        mockRes,
      );
    });
  });

  describe('unreadCount', () => {
    it('Should get unread count for the current user', async () => {
      const mockResult = { count: 5 };
      notificationsProxyServiceMock.request.mockResolvedValue(mockResult);

      const result = await controller.unreadCount(mockUser);

      expect(notificationsProxyServiceMock.request).toHaveBeenCalledWith(
        'GET',
        '/v1/recipients/user-123/notifications/unread-count',
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('readAll', () => {
    it('Should mark all notifications as read for the current user', async () => {
      const mockResult = { success: true };
      notificationsProxyServiceMock.request.mockResolvedValue(mockResult);

      const result = await controller.readAll(mockUser);

      expect(notificationsProxyServiceMock.request).toHaveBeenCalledWith(
        'POST',
        '/v1/recipients/user-123/notifications/read-all',
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('markRead', () => {
    it('Should mark specific notification as read and encode deliveryId', async () => {
      const deliveryId = 'delivery/123+abc';
      const mockResult = { id: deliveryId, read: true };
      notificationsProxyServiceMock.request.mockResolvedValue(mockResult);

      const result = await controller.markRead(mockUser, deliveryId);

      expect(notificationsProxyServiceMock.request).toHaveBeenCalledWith(
        'POST',
        `/v1/recipients/user-123/notifications/${encodeURIComponent(deliveryId)}/read`,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('preferences', () => {
    it('Should get notification preferences for the current user', async () => {
      const mockResult = { channels: [] };
      notificationsProxyServiceMock.request.mockResolvedValue(mockResult);

      const result = await controller.preferences(mockUser);

      expect(notificationsProxyServiceMock.request).toHaveBeenCalledWith(
        'GET',
        '/v1/recipients/user-123/preferences',
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('updatePreferences', () => {
    it('Should update notification preferences for the current user', async () => {
      const updateDto: UpdatePreferencesDto = {
        channels: [{ channel: 'email', enabled: true }],
      };
      const mockResult = { channels: [{ channel: 'email', enabled: true }] };
      notificationsProxyServiceMock.request.mockResolvedValue(mockResult);

      const result = await controller.updatePreferences(mockUser, updateDto);

      expect(notificationsProxyServiceMock.request).toHaveBeenCalledWith(
        'PUT',
        '/v1/recipients/user-123/preferences',
        updateDto,
      );
      expect(result).toEqual(mockResult);
    });
  });
});

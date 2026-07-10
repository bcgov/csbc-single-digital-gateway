import { Body, Controller, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '@repo/nestjs/auth';
import { ZodSerializerDto } from 'nestjs-zod';

import {
  FeedItemDto,
  FeedQueryDto,
  FeedResponseDto,
  PreferencesResponseDto,
  ReadAllResponseDto,
  UnreadCountDto,
  UpdatePreferencesDto,
} from '../dtos/notification.dtos';
import type {
  FeedItem,
  FeedResponse,
  PreferencesResponse,
  ReadAllResponse,
  UnreadCount,
} from '../dtos/notification.dtos';
import { NotificationsProxyService } from '../services/notifications-proxy.service';

/**
 * The citizen notification center's BFF surface. Session-authenticated; every upstream call is
 * scoped to `@CurrentUser().id` — the browser never names a recipient and never sees the
 * m2m token or the notification-service.
 */
@Controller({ path: 'me', version: '1' })
export class MyNotificationsV1Controller {
  constructor(private readonly proxy: NotificationsProxyService) {}

  @Get('notifications')
  @ZodSerializerDto(FeedResponseDto)
  list(@CurrentUser() user: AuthUser, @Query() query: FeedQueryDto): Promise<FeedResponse> {
    return this.proxy.request(
      'GET',
      `/v1/recipients/${user.id}/notifications?limit=${query.limit}&offset=${query.offset}`,
    );
  }

  @Get('notifications/unread-count')
  @ZodSerializerDto(UnreadCountDto)
  unreadCount(@CurrentUser() user: AuthUser): Promise<UnreadCount> {
    return this.proxy.request('GET', `/v1/recipients/${user.id}/notifications/unread-count`);
  }

  @Post('notifications/read-all')
  @HttpCode(200)
  @ZodSerializerDto(ReadAllResponseDto)
  readAll(@CurrentUser() user: AuthUser): Promise<ReadAllResponse> {
    return this.proxy.request('POST', `/v1/recipients/${user.id}/notifications/read-all`);
  }

  @Post('notifications/:deliveryId/read')
  @HttpCode(200)
  @ZodSerializerDto(FeedItemDto)
  markRead(
    @CurrentUser() user: AuthUser,
    @Param('deliveryId') deliveryId: string,
  ): Promise<FeedItem> {
    return this.proxy.request(
      'POST',
      `/v1/recipients/${user.id}/notifications/${encodeURIComponent(deliveryId)}/read`,
    );
  }

  @Get('notification-preferences')
  @ZodSerializerDto(PreferencesResponseDto)
  preferences(@CurrentUser() user: AuthUser): Promise<PreferencesResponse> {
    return this.proxy.request('GET', `/v1/recipients/${user.id}/preferences`);
  }

  @Put('notification-preferences')
  @ZodSerializerDto(PreferencesResponseDto)
  updatePreferences(
    @CurrentUser() user: AuthUser,
    @Body() body: UpdatePreferencesDto,
  ): Promise<PreferencesResponse> {
    return this.proxy.request('PUT', `/v1/recipients/${user.id}/preferences`, body);
  }
}

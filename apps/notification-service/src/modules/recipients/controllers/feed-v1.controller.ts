import { Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';

import {
  FeedItemDto,
  FeedQueryDto,
  FeedResponseDto,
  ReadAllResponseDto,
  UnreadCountDto,
} from '../dtos/feed.dtos';
import type { FeedItem, FeedResponse, ReadAllResponse, UnreadCount } from '../dtos/feed.dtos';
import { FeedService } from '../services/feed.service';

/**
 * In-app notification feed (m2m-guarded; BFF-proxied for end users). Static segments
 * (`unread-count`, `read-all`) are declared before the `:deliveryId` route.
 */
@Controller({ path: 'recipients', version: '1' })
export class FeedV1Controller {
  constructor(private readonly feed: FeedService) {}

  @Get(':userId/notifications')
  @ZodSerializerDto(FeedResponseDto)
  list(@Param('userId') userId: string, @Query() query: FeedQueryDto): Promise<FeedResponse> {
    return this.feed.list(userId, query);
  }

  @Get(':userId/notifications/unread-count')
  @ZodSerializerDto(UnreadCountDto)
  async unreadCount(@Param('userId') userId: string): Promise<UnreadCount> {
    return { count: await this.feed.unreadCount(userId) };
  }

  @Post(':userId/notifications/read-all')
  @HttpCode(200)
  @ZodSerializerDto(ReadAllResponseDto)
  async readAll(@Param('userId') userId: string): Promise<ReadAllResponse> {
    return { updated: await this.feed.markAllRead(userId) };
  }

  @Post(':userId/notifications/:deliveryId/read')
  @HttpCode(200)
  @ZodSerializerDto(FeedItemDto)
  markRead(
    @Param('userId') userId: string,
    @Param('deliveryId') deliveryId: string,
  ): Promise<FeedItem> {
    return this.feed.markRead(userId, deliveryId);
  }
}

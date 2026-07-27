import { Controller, Get, HttpCode, Param, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
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
import { NotificationEventsService } from '../services/notification-events.service';
import { parseUuidParam } from '../util/user-id';

/**
 * In-app notification feed (m2m-guarded; BFF-proxied for end users). Static segments
 * (`unread-count`, `read-all`) are declared before the `:deliveryId` route.
 */
@Controller({ path: 'recipients', version: '1' })
export class FeedV1Controller {
  constructor(
    private readonly feed: FeedService,
    private readonly events: NotificationEventsService,
  ) {}

  /**
   * SSE stream of "your feed changed" events (feature 121). Raw @Res — Nest serialization is
   * bypassed; the m2m guard still runs. Events carry NO data (the client refetches); a comment
   * heartbeat every 25s stays under the web nginx's 60s proxy_read_timeout, and
   * X-Accel-Buffering: no stops nginx from buffering the stream.
   */
  @Get(':userId/notifications/stream')
  stream(@Param('userId') userId: string, @Req() req: Request, @Res() res: Response): void {
    const id = parseUuidParam(userId, 'userId');
    res.status(200);
    res.set({
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    });
    res.flushHeaders();
    res.write(': connected\n\n');
    const unsubscribe = this.events.subscribe(id, () => {
      res.write('event: notification\ndata: {}\n\n');
    });
    const heartbeat = setInterval(() => {
      res.write(': ping\n\n');
    }, 25_000);
    heartbeat.unref();
    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
      res.end();
    });
  }

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

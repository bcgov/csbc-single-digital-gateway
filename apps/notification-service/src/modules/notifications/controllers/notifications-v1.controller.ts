import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';

import { CreateNotificationDto, NotificationResponseDto } from '../dtos/notification.dtos';
import type { NotificationResponse } from '../dtos/notification.dtos';
import { IngestionService } from '../services/ingestion.service';

/**
 * Producer-facing ingestion endpoint. Protected by the global m2m guard (bearer token with
 * the notification-service audience). 201 on a new notification, 200 on an idempotent replay.
 */
@Controller({ path: 'notifications', version: '1' })
export class NotificationsV1Controller {
  constructor(private readonly ingestion: IngestionService) {}

  @Post()
  @ZodSerializerDto(NotificationResponseDto)
  async create(
    @Body() body: CreateNotificationDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<NotificationResponse> {
    const { notification, created } = await this.ingestion.ingest(body);
    res.status(created ? 201 : 200);
    return notification;
  }
}

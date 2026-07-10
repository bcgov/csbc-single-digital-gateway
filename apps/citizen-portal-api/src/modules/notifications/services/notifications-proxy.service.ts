import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../../../config/env.schema';
import { M2mTokenClient } from '../../../notifications/m2m-token.client';

/**
 * Server-side proxy to the notification-service recipient APIs. The m2m token never leaves
 * this process; the caller's identity is ALWAYS the session user's id (the controller passes
 * it — path/body never carry a recipient id). Upstream errors: 404/400 pass through as
 * semantic errors, anything else (5xx, network) becomes a generic 502 with the real cause
 * logged server-side only.
 */
@Injectable()
export class NotificationsProxyService {
  private readonly logger = new Logger(NotificationsProxyService.name);
  private readonly tokenClient: M2mTokenClient;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.tokenClient = new M2mTokenClient({
      issuer: this.config.get('NOTIFICATIONS_M2M_ISSUER', { infer: true }),
      clientId: this.config.get('NOTIFICATIONS_M2M_CLIENT_ID', { infer: true }),
      clientSecret: this.config.get('NOTIFICATIONS_M2M_CLIENT_SECRET', { infer: true }),
    });
  }

  async request<T>(method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown): Promise<T> {
    const base = this.config.get('NOTIFICATION_SERVICE_URL', { infer: true });
    let response: Response;
    try {
      const token = await this.tokenClient.getToken();
      response = await fetch(new URL(path, base), {
        method,
        headers: {
          authorization: `Bearer ${token}`,
          ...(body !== undefined && { 'content-type': 'application/json' }),
        },
        ...(body !== undefined && { body: JSON.stringify(body) }),
      });
    } catch (error) {
      this.logger.error(
        `notification-service unreachable (${method} ${path}): ${error instanceof Error ? error.message : 'unknown'}`,
      );
      throw new BadGatewayException('Notifications are temporarily unavailable');
    }
    if (!response.ok) {
      if (response.status === 404) {
        throw new NotFoundException();
      }
      if (response.status === 400) {
        throw new BadRequestException('Invalid notifications request');
      }
      if (response.status === 401) {
        // Our token was rejected — re-authenticate on the next call rather than retry blindly.
        this.tokenClient.invalidate();
      }
      this.logger.error(`notification-service ${response.status} on ${method} ${path}`);
      throw new BadGatewayException('Notifications are temporarily unavailable');
    }
    return (await response.json()) as T;
  }
}

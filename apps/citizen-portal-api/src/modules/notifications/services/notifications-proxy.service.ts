import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Request, Response as ExpressResponse } from 'express';

import type { Env } from '../../../config/env.schema';
import { M2mTokenClient } from '../../../notifications/m2m-token.client';

/**
 * Server-side proxy to the notification-service recipient APIs. The m2m token never leaves
 * this process; the caller's identity is ALWAYS the session user's id (the controller passes
 * it — path/body never carry a recipient id). Upstream errors: 404/400/422 pass through as
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
      if (response.status === 422) {
        // Semantic validation failure upstream (e.g. email channel on without a contact email) —
        // surface the upstream message (our own service's text, safe) rather than a generic 502.
        const detail: unknown = await response.json().catch(() => null);
        const message =
          typeof detail === 'object' &&
          detail !== null &&
          typeof (detail as { message?: unknown }).message === 'string'
            ? (detail as { message: string }).message
            : 'Invalid notifications request';
        throw new UnprocessableEntityException(message);
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

  /**
   * Pipe the upstream SSE stream 1:1 to the browser (feature 122). Failures BEFORE headers →
   * 502; failures AFTER headers just end the response — the browser EventSource reconnects,
   * re-entering here with a fresh m2m token (which is how mid-stream token expiry self-heals).
   * The AbortController tied to the client connection prevents orphaned upstream streams.
   */
  async pipeStream(path: string, req: Request, res: ExpressResponse): Promise<void> {
    const base = this.config.get('NOTIFICATION_SERVICE_URL', { infer: true });
    const controller = new AbortController();
    req.on('close', () => controller.abort());
    let upstream: Response;
    try {
      const token = await this.tokenClient.getToken();
      upstream = await fetch(new URL(path, base), {
        headers: { authorization: `Bearer ${token}`, accept: 'text/event-stream' },
        signal: controller.signal,
      });
    } catch (error) {
      this.logger.error(
        `notification stream unreachable: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      throw new BadGatewayException('Notifications are temporarily unavailable');
    }
    if (!upstream.ok || upstream.body === null) {
      if (upstream.status === 401) {
        this.tokenClient.invalidate();
      }
      this.logger.error(`notification stream upstream responded ${upstream.status}`);
      throw new BadGatewayException('Notifications are temporarily unavailable');
    }
    res.status(200);
    res.set({
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    });
    res.flushHeaders();
    const reader = upstream.body.getReader();
    try {
      for (;;) {
        // eslint-disable-next-line no-await-in-loop -- sequential stream reads by nature
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        res.write(Buffer.from(value));
      }
    } catch {
      // Aborted by the client or dropped upstream — either way the reconnect loop handles it.
    } finally {
      res.end();
    }
  }
}

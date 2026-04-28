import { HttpService } from '@nestjs/axios';
import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import type { AppConfigDto } from 'src/common/dtos/app-config.dto';
import {
  WorkflowActionsResponseSchema,
  type WorkflowActionsResponse,
} from '../dtos/application-actions.dto';
import {
  WorkflowMessagesUpstreamSchema,
  type WorkflowMessagesResponse,
} from '../dtos/application-messages.dto';

export interface ActorReadContext {
  actorId: string;
  executionId: string;
  workflowConfig: { apiKey: string; tenantId: string };
}

const TIMEOUT_MS = 10_000;

@Injectable()
export class WorkflowActorClientService {
  private readonly logger = new Logger(WorkflowActorClientService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService<AppConfigDto, true>,
  ) {}

  async fetchActions(ctx: ActorReadContext): Promise<WorkflowActionsResponse> {
    const body = await this.fetch(ctx, 'actions');
    const parsed = WorkflowActionsResponseSchema.safeParse(body);
    if (!parsed.success) {
      this.logger.warn('Workflow actions response failed schema validation');
      throw new BadGatewayException('Workflow actor read failed');
    }
    return parsed.data;
  }

  async fetchMessages(
    ctx: ActorReadContext,
  ): Promise<WorkflowMessagesResponse> {
    const body = await this.fetch(ctx, 'messages');
    const parsed = WorkflowMessagesUpstreamSchema.safeParse(body);
    if (!parsed.success) {
      this.logger.warn('Workflow messages response failed schema validation');
      throw new BadGatewayException('Workflow actor read failed');
    }
    return { items: parsed.data };
  }

  private async fetch(
    ctx: ActorReadContext,
    resource: 'actions' | 'messages',
  ): Promise<unknown> {
    const baseUrl = this.configService.get('WORKFLOW_API_URL') ?? '';
    const url =
      `${baseUrl.replace(/\/$/, '')}` +
      `/rest/custom/v1/actors/${encodeURIComponent(ctx.actorId)}/${resource}` +
      `?workflowInstanceId=${encodeURIComponent(ctx.executionId)}`;

    let response;
    try {
      response = await firstValueFrom(
        this.httpService.get<unknown>(url, {
          headers: {
            'X-N8N-API-KEY': ctx.workflowConfig.apiKey,
            'X-TENANT-ID': ctx.workflowConfig.tenantId,
          },
          timeout: TIMEOUT_MS,
          validateStatus: () => true,
        }),
      );
    } catch (err) {
      const message =
        err instanceof AxiosError ? err.message : 'Unknown network error';
      this.logger.warn(`Workflow ${resource} network error: ${message}`);
      throw new BadGatewayException('Workflow actor read failed');
    }

    if (response.status < 200 || response.status >= 300) {
      this.logger.warn(
        `Workflow ${resource} returned non-2xx status ${response.status}`,
      );
      throw new BadGatewayException('Workflow actor read failed');
    }

    return response.data;
  }
}

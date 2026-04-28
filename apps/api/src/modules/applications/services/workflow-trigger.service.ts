import { HttpService } from '@nestjs/axios';
import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import type { AppConfigDto } from 'src/common/dtos/app-config.dto';

export interface WorkflowTriggerConfig {
  apiKey: string;
  tenantId: string;
  triggerEndpoint: string;
}

export interface WorkflowTriggerActor {
  actorId: string;
  actorType: 'user';
  displayName: string;
}

const TIMEOUT_MS = 10_000;

@Injectable()
export class WorkflowTriggerService {
  private readonly logger = new Logger(WorkflowTriggerService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService<AppConfigDto, true>,
  ) {}

  async trigger(
    config: WorkflowTriggerConfig,
    actor: WorkflowTriggerActor,
  ): Promise<{ workflowId: string; executionId: string }> {
    const baseUrl = this.configService.get('WORKFLOW_API_URL') ?? '';
    const url = `${baseUrl.replace(/\/$/, '')}${config.triggerEndpoint.startsWith('/') ? '' : '/'}${config.triggerEndpoint}`;

    let response;
    try {
      response = await firstValueFrom(
        this.httpService.post<unknown>(url, actor, {
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': config.apiKey,
            'X-TENANT-ID': config.tenantId,
          },
          timeout: TIMEOUT_MS,
          validateStatus: () => true,
        }),
      );
    } catch (err) {
      const message =
        err instanceof AxiosError ? err.message : 'Unknown network error';
      this.logger.warn(`Workflow trigger network error: ${message}`);
      throw new BadGatewayException('Workflow trigger failed');
    }

    if (response.status < 200 || response.status >= 300) {
      this.logger.warn(
        `Workflow trigger returned non-2xx status ${response.status}`,
      );
      throw new BadGatewayException('Workflow trigger failed');
    }

    const body = response.data;
    if (!body || typeof body !== 'object') {
      this.logger.warn('Workflow trigger response body is not an object');
      throw new BadGatewayException('Workflow trigger failed');
    }

    const workflowId = (body as Record<string, string>).WorkflowId;

    const instance = (body as Record<string, string>).WorkflowInstance;
    if (instance.length === 0) {
      this.logger.warn(
        'Workflow trigger response missing or invalid WorkflowInstance',
      );
      throw new BadGatewayException('Workflow trigger failed');
    }

    return { workflowId, executionId: instance };
  }
}

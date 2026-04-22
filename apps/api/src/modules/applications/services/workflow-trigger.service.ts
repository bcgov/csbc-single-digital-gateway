import { HttpService } from '@nestjs/axios';
import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

export interface WorkflowTriggerConfig {
  apiKey: string;
  tenantId: string;
  triggerUrl: string;
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

  constructor(private readonly httpService: HttpService) {}

  async trigger(
    config: WorkflowTriggerConfig,
    actor: WorkflowTriggerActor,
  ): Promise<{ executionId: string }> {
    let response;
    try {
      response = await firstValueFrom(
        this.httpService.post<unknown>(config.triggerUrl, actor, {
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

    const instance = (body as Record<string, unknown>).WorkflowInstance;
    if (typeof instance !== 'string' || instance.length === 0) {
      this.logger.warn(
        'Workflow trigger response missing or invalid WorkflowInstance',
      );
      throw new BadGatewayException('Workflow trigger failed');
    }

    return { executionId: instance };
  }
}

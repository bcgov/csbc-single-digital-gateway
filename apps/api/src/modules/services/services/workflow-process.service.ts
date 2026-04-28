import { HttpService } from '@nestjs/axios';
import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import type { AppConfigDto } from 'src/common/dtos/app-config.dto';
import type { ProcessStep } from '../dtos/application-process.dto';

export interface WorkflowProcessFetchConfig {
  apiKey: string;
  tenantId: string;
  workflowId: string;
}

export interface WorkflowProcessFetchResult {
  workflowId: string;
  name: string;
  steps: ProcessStep[];
}

interface N8nNode {
  id: string;
  name: string;
  type: string;
  disabled?: boolean;
  notes?: string;
}

interface N8nConnectionTarget {
  node: string;
  type: string;
  index: number;
}

interface N8nConnections {
  [nodeName: string]:
    | { main?: N8nConnectionTarget[][] | null | undefined }
    | undefined;
}

interface N8nWorkflowBody {
  id?: string;
  name?: string;
  nodes: N8nNode[];
  connections: N8nConnections;
}

const TIMEOUT_MS = 10_000;
const REQUEST_FORM_PREFIX = 'Request Form ';
const SUBMIT_FORM_PREFIX = 'State:';

@Injectable()
export class WorkflowProcessService {
  private readonly logger = new Logger(WorkflowProcessService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService<AppConfigDto, true>,
  ) {}

  async fetch(
    config: WorkflowProcessFetchConfig,
  ): Promise<WorkflowProcessFetchResult> {
    const baseUrl = this.configService.get<string>('WORKFLOW_API_URL') ?? '';
    const url = `${baseUrl.replace(/\/$/, '')}/api/v1/workflows/${encodeURIComponent(config.workflowId)}`;

    let response;
    try {
      response = await firstValueFrom(
        this.httpService.get<unknown>(url, {
          headers: {
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
      this.logger.warn(`Workflow fetch network error: ${message}`);
      throw new BadGatewayException('Workflow fetch failed');
    }

    if (response.status < 200 || response.status >= 300) {
      this.logger.warn(
        `Workflow fetch returned non-2xx status ${response.status}`,
      );
      throw new BadGatewayException('Workflow fetch failed');
    }

    const body = this.parseBody(response.data);
    const rawSteps = this.transform(body);
    const steps = this.applyStepFilter(rawSteps);

    const upstreamId =
      typeof body.id === 'string' && body.id.length > 0
        ? body.id
        : config.workflowId;
    const upstreamName = typeof body.name === 'string' ? body.name : '';

    return {
      workflowId: upstreamId,
      name: upstreamName,
      steps,
    };
  }

  private parseBody(raw: unknown): N8nWorkflowBody {
    if (!raw || typeof raw !== 'object') {
      this.logger.warn('Workflow fetch response body is not an object');
      throw new BadGatewayException('Workflow fetch failed');
    }
    const obj = raw as Record<string, unknown>;
    if (!Array.isArray(obj.nodes)) {
      this.logger.warn('Workflow fetch response missing nodes array');
      throw new BadGatewayException('Workflow fetch failed');
    }
    if (!obj.connections || typeof obj.connections !== 'object') {
      this.logger.warn('Workflow fetch response missing connections object');
      throw new BadGatewayException('Workflow fetch failed');
    }
    return obj as unknown as N8nWorkflowBody;
  }

  private transform(body: N8nWorkflowBody): ProcessStep[] {
    const nodesById = new Map<string, N8nNode>();
    const nodesByName = new Map<string, N8nNode>();
    for (const node of body.nodes) {
      if (
        !node ||
        typeof node.id !== 'string' ||
        typeof node.name !== 'string'
      ) {
        continue;
      }
      nodesById.set(node.id, node);
      nodesByName.set(node.name, node);
    }

    const trigger = body.nodes.find(
      (n) => n && n.disabled !== true && this.isTriggerType(n.type),
    );
    if (!trigger) {
      this.logger.warn(
        'Workflow fetch response has no detectable trigger node',
      );
      throw new BadGatewayException('Workflow fetch failed');
    }

    const visited = new Set<string>();
    const queue: N8nNode[] = [trigger];
    const steps: ProcessStep[] = [];

    while (queue.length > 0) {
      const current = queue.shift() as N8nNode;
      if (visited.has(current.id)) continue;
      visited.add(current.id);

      if (current.id !== trigger.id && current.disabled !== true) {
        steps.push(this.toStep(current));
      }

      const next = this.resolveSuccessors(
        current,
        body.connections,
        nodesByName,
      );
      for (const node of next) {
        if (!visited.has(node.id)) {
          queue.push(node);
        }
      }
    }

    return steps;
  }

  private resolveSuccessors(
    node: N8nNode,
    connections: N8nConnections,
    nodesByName: Map<string, N8nNode>,
  ): N8nNode[] {
    const outgoing = connections[node.name];
    if (!outgoing || !Array.isArray(outgoing.main)) return [];
    const main0 = outgoing.main[0];
    if (!Array.isArray(main0)) return [];

    const successors: N8nNode[] = [];
    const queue: string[] = main0
      .map((t) => t?.node)
      .filter((n): n is string => typeof n === 'string');
    const localVisited = new Set<string>();

    while (queue.length > 0) {
      const name = queue.shift() as string;
      if (localVisited.has(name)) continue;
      localVisited.add(name);
      const next = nodesByName.get(name);
      if (!next) continue;
      if (next.disabled === true) {
        const bridged = connections[next.name];
        const bridgedMain0 = bridged?.main?.[0];
        if (Array.isArray(bridgedMain0)) {
          for (const t of bridgedMain0) {
            if (t && typeof t.node === 'string') queue.push(t.node);
          }
        }
        continue;
      }
      successors.push(next);
    }

    return successors;
  }

  private applyStepFilter(steps: ProcessStep[]): ProcessStep[] {
    return steps.flatMap((step) => {
      if (!step.label.startsWith(REQUEST_FORM_PREFIX)) {
        return [];
      }
      const suffix = step.label.slice(REQUEST_FORM_PREFIX.length);
      return [{ ...step, label: `${SUBMIT_FORM_PREFIX}${suffix}` }];
    });
  }

  private toStep(node: N8nNode): ProcessStep {
    const description =
      typeof node.notes === 'string' && node.notes.trim().length > 0
        ? node.notes.trim()
        : undefined;
    return description === undefined
      ? { id: node.id, label: node.name }
      : { id: node.id, label: node.name, description };
  }

  private isTriggerType(type: string | undefined): boolean {
    if (typeof type !== 'string') return false;
    return type.endsWith('.webhook') || type.endsWith('Trigger');
  }
}

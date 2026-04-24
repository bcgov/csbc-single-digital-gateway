import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { PUBLIC_ROUTE_KEY } from '../../../auth/decorators/public-route.decorator';
import { ServicesV1Controller } from '../services-v1.controller';

describe('ServicesV1Controller — application process route', () => {
  let controller: ServicesV1Controller;
  let servicesService: {
    resolveWorkflowApplicationConfig: jest.Mock;
    findAllPublished: jest.Mock;
    findOnePublished: jest.Mock;
    findOneVersion: jest.Mock;
  };
  let workflowProcessService: { fetch: jest.Mock };

  const SERVICE_ID = '11111111-1111-4111-8111-111111111111';
  const VERSION_ID = '22222222-2222-4222-8222-222222222222';
  const APPLICATION_ID = '33333333-3333-4333-8333-333333333333';

  const resolvedConfig = {
    apiKey: 'api-key-abc',
    tenantId: '44444444-4444-4444-8444-444444444444',
    workflowId: 'wf-1',
  };

  const fetchResult = {
    workflowId: 'wf-1',
    name: 'Intake Workflow',
    steps: [
      { id: 'node-a', label: 'Submit form' },
      { id: 'node-b', label: 'Review', description: 'Manual review step.' },
    ],
  };

  beforeEach(() => {
    servicesService = {
      resolveWorkflowApplicationConfig: jest.fn().mockResolvedValue(resolvedConfig),
      findAllPublished: jest.fn(),
      findOnePublished: jest.fn(),
      findOneVersion: jest.fn(),
    };
    workflowProcessService = {
      fetch: jest.fn().mockResolvedValue(fetchResult),
    };
    controller = new ServicesV1Controller(
      servicesService as never,
      workflowProcessService as never,
    );
  });

  describe('GET :serviceId/versions/:versionId/application-process', () => {
    it('should be registered as a public route (AuthGuard skips it)', () => {
      const metadata = Reflect.getMetadata(
        PUBLIC_ROUTE_KEY,
        controller.getApplicationProcess,
      );
      expect(metadata).toBe(true);
    });

    it('should set Cache-Control: no-store header metadata on the route', () => {
      const headers = Reflect.getMetadata(
        '__headers__',
        controller.getApplicationProcess,
      );
      expect(headers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Cache-Control', value: 'no-store' }),
        ]),
      );
    });

    it('should resolve the workflow config via ServicesService using serviceId, versionId, applicationId, locale', async () => {
      await controller.getApplicationProcess(
        { serviceId: SERVICE_ID, versionId: VERSION_ID } as never,
        { applicationId: APPLICATION_ID, locale: 'fr' } as never,
      );
      expect(servicesService.resolveWorkflowApplicationConfig).toHaveBeenCalledWith({
        serviceId: SERVICE_ID,
        versionId: VERSION_ID,
        applicationId: APPLICATION_ID,
        locale: 'fr',
      });
    });

    it('should default locale to "en" via the DTO when omitted by the client', async () => {
      // DTO-level default is applied by ZodValidationPipe in prod; controller receives locale='en'
      await controller.getApplicationProcess(
        { serviceId: SERVICE_ID, versionId: VERSION_ID } as never,
        { applicationId: APPLICATION_ID, locale: 'en' } as never,
      );
      expect(
        servicesService.resolveWorkflowApplicationConfig,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ locale: 'en' }),
      );
    });

    it('should delegate to WorkflowProcessService.fetch with the resolved config', async () => {
      await controller.getApplicationProcess(
        { serviceId: SERVICE_ID, versionId: VERSION_ID } as never,
        { applicationId: APPLICATION_ID, locale: 'en' } as never,
      );
      expect(workflowProcessService.fetch).toHaveBeenCalledWith({
        apiKey: resolvedConfig.apiKey,
        tenantId: resolvedConfig.tenantId,
        workflowId: resolvedConfig.workflowId,
      });
    });

    it('should return { applicationId, workflowId, name, steps }', async () => {
      const response = await controller.getApplicationProcess(
        { serviceId: SERVICE_ID, versionId: VERSION_ID } as never,
        { applicationId: APPLICATION_ID, locale: 'en' } as never,
      );
      expect(response).toEqual({
        applicationId: APPLICATION_ID,
        workflowId: fetchResult.workflowId,
        name: fetchResult.name,
        steps: fetchResult.steps,
      });
    });

    it('should echo the query applicationId in the response (not the upstream workflowId)', async () => {
      const response = await controller.getApplicationProcess(
        { serviceId: SERVICE_ID, versionId: VERSION_ID } as never,
        { applicationId: APPLICATION_ID, locale: 'en' } as never,
      );
      expect(response.applicationId).toBe(APPLICATION_ID);
      expect(response.workflowId).toBe(fetchResult.workflowId);
    });
  });

  describe('resolution failures', () => {
    it('should propagate a NotFoundException from ServicesService unchanged', async () => {
      servicesService.resolveWorkflowApplicationConfig.mockRejectedValueOnce(
        new NotFoundException('Application not found'),
      );
      await expect(
        controller.getApplicationProcess(
          { serviceId: SERVICE_ID, versionId: VERSION_ID } as never,
          { applicationId: APPLICATION_ID, locale: 'en' } as never,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(workflowProcessService.fetch).not.toHaveBeenCalled();
    });
  });

  describe('upstream failures', () => {
    it('should propagate a BadGatewayException from WorkflowProcessService unchanged (502)', async () => {
      workflowProcessService.fetch.mockRejectedValueOnce(
        new BadGatewayException('Workflow fetch failed'),
      );
      await expect(
        controller.getApplicationProcess(
          { serviceId: SERVICE_ID, versionId: VERSION_ID } as never,
          { applicationId: APPLICATION_ID, locale: 'en' } as never,
        ),
      ).rejects.toBeInstanceOf(BadGatewayException);
    });
  });
});

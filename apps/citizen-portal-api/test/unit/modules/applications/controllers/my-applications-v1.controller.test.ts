import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type AuthUser } from '@repo/nestjs/auth';
import { MyApplicationsV1Controller } from '../../../../../src/modules/applications/controllers/my-applications-v1.controller';
import { ApplicationsService } from '../../../../../src/modules/applications/services/applications.service';

describe('MyApplicationsV1Controller Unit Test Suite', () => {
  let controller: MyApplicationsV1Controller;
  let applicationsServiceMock: any;

  const mockUser = { id: 'user-123' } as unknown as AuthUser;

  beforeEach(() => {
    applicationsServiceMock = {
      listMine: vi.fn(),
      createOrResumeDraft: vi.fn(),
      getDetail: vi.fn(),
      saveDraft: vi.fn(),
      submit: vi.fn(),
      revise: vi.fn(),
    };
    controller = new MyApplicationsV1Controller(
      applicationsServiceMock as unknown as ApplicationsService,
    );
  });

  describe('list', () => {
    it('should list applications for the current user', async () => {
      const mockItems = [{ id: 'app-1' }, { id: 'app-2' }];
      applicationsServiceMock.listMine.mockResolvedValue(mockItems);

      const result = await controller.list(mockUser);

      expect(applicationsServiceMock.listMine).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({ items: mockItems });
    });
  });

  describe('create', () => {
    it('should create or resume draft for the current user', async () => {
      const formVersionId = 'version-456';
      const mockSubmission = { id: 'submission-123', status: 'draft' };
      applicationsServiceMock.createOrResumeDraft.mockResolvedValue(mockSubmission);

      const result = await controller.create(mockUser, { formVersionId });

      expect(applicationsServiceMock.createOrResumeDraft).toHaveBeenCalledWith(
        'user-123',
        formVersionId,
      );
      expect(result).toEqual(mockSubmission);
    });
  });

  describe('get', () => {
    it('should get application details for the current user', async () => {
      const id = 'app-123';
      const mockDetail = { id, formVersionId: 'version-1', status: 'draft' };
      applicationsServiceMock.getDetail.mockResolvedValue(mockDetail);

      const result = await controller.get(mockUser, id);

      expect(applicationsServiceMock.getDetail).toHaveBeenCalledWith('user-123', id);
      expect(result).toEqual(mockDetail);
    });
  });

  describe('save', () => {
    it('should save drafts for the current user', async () => {
      const id = 'app-123';
      const data = { field: 'value' };
      const mockResult = { id, status: 'draft' };
      applicationsServiceMock.saveDraft.mockResolvedValue(mockResult);

      const result = await controller.save(mockUser, id, { data });

      expect(applicationsServiceMock.saveDraft).toHaveBeenCalledWith('user-123', id, data);
      expect(result).toEqual(mockResult);
    });
  });

  describe('submit', () => {
    it('should submit an application for the current user', async () => {
      const id = 'app-123';
      const data = { field: 'value' };
      const mockResult = { id, status: 'submitted' };
      applicationsServiceMock.submit.mockResolvedValue(mockResult);

      const result = await controller.submit(mockUser, id, { data });

      expect(applicationsServiceMock.submit).toHaveBeenCalledWith('user-123', id, data);
      expect(result).toEqual(mockResult);
    });
  });

  describe('revise', () => {
    it('should set an application to revision status for the current user', async () => {
      const id = 'app-123';
      const mockResult = { id, status: 'revision_requested' };
      applicationsServiceMock.revise.mockResolvedValue(mockResult);

      const result = await controller.revise(mockUser, id);

      expect(applicationsServiceMock.revise).toHaveBeenCalledWith('user-123', id);
      expect(result).toEqual(mockResult);
    });
  });
});

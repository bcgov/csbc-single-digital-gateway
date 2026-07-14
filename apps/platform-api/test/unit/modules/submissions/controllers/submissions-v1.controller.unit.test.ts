import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SubmissionsV1Controller } from '../../../../../src/modules/submissions/controllers/submissions-v1.controller';
import type { AuthUser } from '@repo/nestjs/auth';
import type {
  ListSubmissionsQueryDto,
  ReviewSubmissionDto,
} from '../../../../../src/modules/submissions/dtos/submission.dtos';

describe('SubmissionsV1Controller', () => {
  let controller: SubmissionsV1Controller;
  let submissionsServiceMock: any;

  const mockUser: AuthUser = {
    id: 'user-1',
    roles: ['staff'],
    claims: {
      sub: 'user-1-sub',
      email: 'test@example.com',
      name: 'Test User',
    },
  };

  beforeEach(() => {
    submissionsServiceMock = {
      list: vi.fn(),
      get: vi.fn(),
      review: vi.fn(),
    };

    controller = new SubmissionsV1Controller(submissionsServiceMock);
  });

  describe('list', () => {
    it('lists submissions via the submissions service', async () => {
      const query: ListSubmissionsQueryDto = {
        workspaceId: 'workspace-1',
      };
      const mockResult = [{ id: 'sub-1', status: 'pending' }];
      submissionsServiceMock.list.mockResolvedValue(mockResult);

      const result = await controller.list(mockUser, query);

      expect(submissionsServiceMock.list).toHaveBeenCalledWith(mockUser.id, query);
      expect(result).toEqual({ items: mockResult });
    });
  });

  describe('get', () => {
    it('gets submission detail via the submissions service', async () => {
      const mockResult = { id: 'sub-1', status: 'pending', data: {} };
      submissionsServiceMock.get.mockResolvedValue(mockResult);

      const result = await controller.get(mockUser, 'sub-1');

      expect(submissionsServiceMock.get).toHaveBeenCalledWith(mockUser.id, 'sub-1');
      expect(result).toEqual(mockResult);
    });
  });

  describe('review', () => {
    it('reviews a submission via the submissions service', async () => {
      const body: ReviewSubmissionDto = {
        decision: 'approve',
        reason: 'Looks good!',
      };
      const mockResult = { id: 'sub-1', status: 'approved', staffFeedback: 'Looks good!' };
      submissionsServiceMock.review.mockResolvedValue(mockResult);

      const result = await controller.review(mockUser, 'sub-1', body);

      expect(submissionsServiceMock.review).toHaveBeenCalledWith(mockUser.id, 'sub-1', body);
      expect(result).toEqual(mockResult);
    });
  });
});

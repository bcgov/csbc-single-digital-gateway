import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FormsV1Controller } from '../../../../../src/modules/forms/controllers/forms-v1.controller';
import type { AuthUser } from '@repo/nestjs/auth';
import type {
  CreateFormDto,
  UpdateFormContentDto,
} from '../../../../../src/modules/forms/dtos/form.dtos';

describe('FormsV1Controller', () => {
  let controller: FormsV1Controller;
  let formsServiceMock: any;

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
    formsServiceMock = {
      create: vi.fn(),
      get: vi.fn(),
      updateContent: vi.fn(),
    };

    controller = new FormsV1Controller(formsServiceMock);
  });

  describe('create', () => {
    it('creates a form via the forms service', async () => {
      const body: CreateFormDto = {
        workspaceId: 'e6005cbb-84f9-467a-bb48-e8cbffc9c991',
        title: 'New Form',
        content: {
          schema: { type: 'object', properties: {} },
          variants: { default: { type: 'Form', elements: [] } },
        },
      };
      const mockResult = {
        id: 'form-1',
        title: 'New Form',
        workspaceId: 'e6005cbb-84f9-467a-bb48-e8cbffc9c991',
        version: 1,
      };
      formsServiceMock.create.mockResolvedValue(mockResult);

      const result = await controller.create(mockUser, body);

      expect(formsServiceMock.create).toHaveBeenCalledWith(mockUser.id, body);
      expect(result).toEqual(mockResult);
    });
  });

  describe('get', () => {
    it('gets a form via the forms service', async () => {
      const mockResult = {
        id: 'form-1',
        title: 'New Form',
        workspaceId: 'e6005cbb-84f9-467a-bb48-e8cbffc9c991',
        version: 1,
      };
      formsServiceMock.get.mockResolvedValue(mockResult);

      const result = await controller.get(mockUser, 'form-1');

      expect(formsServiceMock.get).toHaveBeenCalledWith(mockUser.id, 'form-1');
      expect(result).toEqual(mockResult);
    });
  });

  describe('updateContent', () => {
    it("updates a draft version's content via the forms service", async () => {
      const body: UpdateFormContentDto = {
        content: {
          schema: { type: 'object', properties: {} },
          variants: { default: { type: 'Form', elements: [], label: 'Updated Title' } },
        },
      };
      const mockResult = {
        id: 'v-1',
        documentId: 'form-1',
        versionNumber: 1,
        title: 'Updated Title',
        content: body.content,
      };
      formsServiceMock.updateContent.mockResolvedValue(mockResult);

      const result = await controller.updateContent(mockUser, 'form-1', 'v-1', body);

      expect(formsServiceMock.updateContent).toHaveBeenCalledWith(
        mockUser.id,
        'form-1',
        'v-1',
        body,
      );
      expect(result).toEqual(mockResult);
    });
  });
});

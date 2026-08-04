import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FormsV1Controller } from '../../../../../src/modules/forms/controllers/forms-v1.controller';
import type { AuthUser } from '@repo/nestjs/auth';
import type {
  CreateFormDto,
  UpdateFormSchemaDto,
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
      updateSchema: vi.fn(),
    };

    controller = new FormsV1Controller(formsServiceMock);
  });

  describe('create', () => {
    it('creates a form via the forms service', async () => {
      const body: CreateFormDto = {
        workspaceId: 'e6005cbb-84f9-467a-bb48-e8cbffc9c991',
        typeId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        title: 'New Form',
        definition: { schema: {}, uischema: {} },
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

  describe('updateSchema', () => {
    it('updates a form schema via the forms service', async () => {
      const body: UpdateFormSchemaDto = {
        definition: { schema: {}, uischema: {} },
        title: 'Updated Title',
      };
      const mockResult = {
        id: 'v-1',
        formId: 'form-1',
        version: 1,
        definition: { schema: {}, uischema: {} },
      };
      formsServiceMock.updateSchema.mockResolvedValue(mockResult);

      const result = await controller.updateSchema(mockUser, 'form-1', 'v-1', body);

      expect(formsServiceMock.updateSchema).toHaveBeenCalledWith(
        mockUser.id,
        'form-1',
        'v-1',
        body,
      );
      expect(result).toEqual(mockResult);
    });
  });
});

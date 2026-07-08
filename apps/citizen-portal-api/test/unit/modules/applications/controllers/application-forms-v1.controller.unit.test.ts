import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApplicationFormsV1Controller } from '../../../../../src/modules/applications/controllers/application-forms-v1.controller';
import { ApplicationsService } from '../../../../../src/modules/applications/services/applications.service';

describe('ApplicationFormsV1Controller Unit Tests', () => {
  let controller: ApplicationFormsV1Controller;
  let applicationsServiceMock: any;

  beforeEach(() => {
    applicationsServiceMock = {
      getApplicationForm: vi.fn(),
    };
    controller = new ApplicationFormsV1Controller(
      applicationsServiceMock as unknown as ApplicationsService,
    );
  });

  it('should call getApplicationForm on ApplicationsService with the correct arguments', async () => {
    const id = 'test-id';
    const formId = 'test-form-id';
    const expectedResult = { id: 'test-form-id', schema: {}, layout: {} };

    applicationsServiceMock.getApplicationForm.mockResolvedValue(expectedResult);

    const result = await controller.getForm(id, formId);

    expect(applicationsServiceMock.getApplicationForm).toHaveBeenCalledWith(id, formId);
    expect(result).toEqual(expectedResult);
  });
});

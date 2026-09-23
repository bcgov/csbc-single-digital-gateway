import { beforeEach, describe, expect, it } from 'vitest';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  type Database,
  documentReferences,
  documentVersions,
  documents,
  serviceAgreementConsents,
  workspaceDefaultAgreements,
} from '@repo/database';
import { ConsentService } from '../../../../../src/modules/applications/services/consent.service';
import { createMockDb } from '../../../../utils/createMockDb';

describe('ConsentService Unit Test Suite', () => {
  let service: ConsentService;
  let dbMock: any;
  let mockResponse: any;

  beforeEach(() => {
    const mocks = createMockDb();
    dbMock = mocks.builderMock;
    mockResponse = mocks.mockResponse;
    service = new ConsentService(dbMock as unknown as Database);
  });

  describe('agreementsForService', () => {
    it('Should throw NotFoundException if service is not found', async () => {
      mockResponse([], documents, 'select'); // no service found

      await expect(service.agreementsForService('user-1', 'svc-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Should return service agreements (attached and defaults, deduped, with latest user decision)', async () => {
      // 1. service check (documents query)
      mockResponse([{ versionId: 'svc-ver-1' }], documents, 'select');

      // 2. resolveForServiceVersion -> attached agreements select
      mockResponse(
        [
          {
            agreementDocumentId: 'agreement-doc-1',
            agreementVersionId: 'agreement-ver-1',
            data: { title: 'Attached Agreement', isOptional: false },
          },
        ],
        documentReferences,
        'select',
      );

      // 3. resolveForServiceVersion -> workspaceId select
      mockResponse([{ workspaceId: 'ws-1' }], documentVersions, 'select');

      // 4. resolveForServiceVersion -> default agreements select
      mockResponse(
        [
          {
            agreementDocumentId: 'agreement-doc-2',
            agreementVersionId: 'agreement-ver-2',
            data: { title: 'Default Agreement', isOptional: true },
          },
        ],
        workspaceDefaultAgreements,
        'select',
      );

      // 5. resolveForServiceVersion -> consent check for Default Agreement (since defaults are processed first)
      mockResponse([{ decision: 'approve' }], serviceAgreementConsents, 'select');

      // 6. resolveForServiceVersion -> consent check for Attached Agreement
      mockResponse([], serviceAgreementConsents, 'select');

      const result = await service.agreementsForService('user-1', 'svc-id');

      expect(result).toEqual([
        {
          agreementVersionId: 'agreement-ver-2',
          agreementDocumentId: 'agreement-doc-2',
          data: { title: 'Default Agreement', isOptional: true },
          decision: 'approve',
        },
        {
          agreementVersionId: 'agreement-ver-1',
          agreementDocumentId: 'agreement-doc-1',
          data: { title: 'Attached Agreement', isOptional: false },
          decision: null,
        },
      ]);
    });

    it('Should deduplicate agreements by agreementDocumentId (defaults first)', async () => {
      // 1. service check (documents query)
      mockResponse([{ versionId: 'svc-ver-1' }], documents, 'select');

      // 2. resolveForServiceVersion -> attached agreements (contains agreement-doc-1)
      mockResponse(
        [
          {
            agreementDocumentId: 'agreement-doc-1',
            agreementVersionId: 'agreement-ver-1-attached',
            data: { title: 'Attached Agreement', isOptional: false },
          },
        ],
        documentReferences,
        'select',
      );

      // 3. resolveForServiceVersion -> workspaceId select
      mockResponse([{ workspaceId: 'ws-1' }], documentVersions, 'select');

      // 4. resolveForServiceVersion -> default agreements (also contains agreement-doc-1)
      mockResponse(
        [
          {
            agreementDocumentId: 'agreement-doc-1',
            agreementVersionId: 'agreement-ver-1-default',
            data: { title: 'Default Agreement', isOptional: true },
          },
        ],
        workspaceDefaultAgreements,
        'select',
      );

      // 5. resolveForServiceVersion -> consent check for Default Agreement (only agreement-ver-1-default is queried since the attached one is deduped)
      mockResponse([{ decision: 'approve' }], serviceAgreementConsents, 'select');

      const result = await service.agreementsForService('user-1', 'svc-id');

      // Verify that it only contains one item, which is the default version (defaults are processed first)
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        agreementVersionId: 'agreement-ver-1-default',
        agreementDocumentId: 'agreement-doc-1',
        data: { title: 'Default Agreement', isOptional: true },
        decision: 'approve',
      });
    });
  });

  describe('record', () => {
    it('Should throw UnprocessableEntityException if not a published service agreement version', async () => {
      mockResponse([], documentVersions, 'select');

      await expect(service.record('user-1', 'agreement-ver-1', 'approve')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('Should skip write if latest decision is already the same', async () => {
      // 1. agreement check
      mockResponse([{ agreementDocumentId: 'agreement-doc-1' }], documentVersions, 'select');
      // 2. latest consent check
      mockResponse([{ decision: 'approve' }], serviceAgreementConsents, 'select');

      const result = await service.record('user-1', 'agreement-ver-1', 'approve');

      expect(result).toEqual({
        agreementVersionId: 'agreement-ver-1',
        decision: 'approve',
      });
      // We expect no further mock responses since it should return early and not insert
    });

    it('Should insert new consent decision if different or does not exist', async () => {
      // 1. agreement check
      mockResponse([{ agreementDocumentId: 'agreement-doc-1' }], documentVersions, 'select');
      // 2. latest consent check (empty -> does not exist)
      mockResponse([], serviceAgreementConsents, 'select');
      // 3. insert call response
      mockResponse([], serviceAgreementConsents, 'insert');

      const result = await service.record('user-1', 'agreement-ver-1', 'approve');

      expect(result).toEqual({
        agreementVersionId: 'agreement-ver-1',
        decision: 'approve',
      });
    });
  });

  describe('assertSubmittableForForm', () => {
    it('Should return undefined (no gate) if form version is not linked to a service', async () => {
      mockResponse([], documentReferences, 'select'); // no service version reference found

      await expect(
        service.assertSubmittableForForm('user-1', 'form-ver-1'),
      ).resolves.toBeUndefined();
    });

    it('Should throw UnprocessableEntityException if a required service agreement is not approved', async () => {
      // 1. get serviceVersionId
      mockResponse([{ serviceVersionId: 'svc-ver-1' }], documentReferences, 'select');
      // 2. resolveForServiceVersion -> attached agreements
      mockResponse(
        [
          {
            agreementDocumentId: 'agreement-doc-1',
            agreementVersionId: 'agreement-ver-1',
            data: { title: 'Required Agreement', isOptional: false },
          },
        ],
        documentReferences,
        'select',
      );
      // 3. resolveForServiceVersion -> workspaceId
      mockResponse([{ workspaceId: 'ws-1' }], documentVersions, 'select');
      // 4. resolveForServiceVersion -> default agreements
      mockResponse([], workspaceDefaultAgreements, 'select');
      // 5. resolveForServiceVersion -> consent check (rejected instead of approved)
      mockResponse([{ decision: 'reject' }], serviceAgreementConsents, 'select');

      await expect(service.assertSubmittableForForm('user-1', 'form-ver-1')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('Should throw UnprocessableEntityException if any agreement is not decided (decision is null)', async () => {
      // 1. get serviceVersionId
      mockResponse([{ serviceVersionId: 'svc-ver-1' }], documentReferences, 'select');
      // 2. resolveForServiceVersion -> attached agreements
      mockResponse(
        [
          {
            agreementDocumentId: 'agreement-doc-1',
            agreementVersionId: 'agreement-ver-1',
            data: { title: 'Optional Agreement', isOptional: true },
          },
        ],
        documentReferences,
        'select',
      );
      // 3. resolveForServiceVersion -> workspaceId
      mockResponse([{ workspaceId: 'ws-1' }], documentVersions, 'select');
      // 4. resolveForServiceVersion -> default agreements
      mockResponse([], workspaceDefaultAgreements, 'select');
      // 5. resolveForServiceVersion -> consent check (no decision)
      mockResponse([], serviceAgreementConsents, 'select');

      await expect(service.assertSubmittableForForm('user-1', 'form-ver-1')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('Should succeed if all required agreements are approved and all optional agreements are decided', async () => {
      // 1. get serviceVersionId
      mockResponse([{ serviceVersionId: 'svc-ver-1' }], documentReferences, 'select');
      // 2. resolveForServiceVersion -> attached agreements
      mockResponse(
        [
          {
            agreementDocumentId: 'agreement-doc-1',
            agreementVersionId: 'agreement-ver-1',
            data: { title: 'Required Agreement', isOptional: false },
          },
          {
            agreementDocumentId: 'agreement-doc-2',
            agreementVersionId: 'agreement-ver-2',
            data: { title: 'Optional Agreement', isOptional: true },
          },
        ],
        documentReferences,
        'select',
      );
      // 3. resolveForServiceVersion -> workspaceId
      mockResponse([{ workspaceId: 'ws-1' }], documentVersions, 'select');
      // 4. resolveForServiceVersion -> default agreements
      mockResponse([], workspaceDefaultAgreements, 'select');
      // 5. resolveForServiceVersion -> consent check for Required Agreement
      mockResponse([{ decision: 'approve' }], serviceAgreementConsents, 'select');
      // 6. resolveForServiceVersion -> consent check for Optional Agreement
      mockResponse([{ decision: 'reject' }], serviceAgreementConsents, 'select');

      await expect(
        service.assertSubmittableForForm('user-1', 'form-ver-1'),
      ).resolves.toBeUndefined();
    });

    it('Should fall back to "Service agreement" if title is not a string', async () => {
      // 1. get serviceVersionId
      mockResponse([{ serviceVersionId: 'svc-ver-1' }], documentReferences, 'select');
      // 2. resolveForServiceVersion -> attached agreements
      mockResponse(
        [
          {
            agreementDocumentId: 'agreement-doc-1',
            agreementVersionId: 'agreement-ver-1',
            data: { isOptional: false },
          },
        ],
        documentReferences,
        'select',
      );
      // 3. resolveForServiceVersion -> workspaceId
      mockResponse([{ workspaceId: 'ws-1' }], documentVersions, 'select');
      // 4. resolveForServiceVersion -> default agreements
      mockResponse([], workspaceDefaultAgreements, 'select');
      // 5. resolveForServiceVersion -> consent check (rejected)
      mockResponse([{ decision: 'reject' }], serviceAgreementConsents, 'select');

      try {
        await service.assertSubmittableForForm('user-1', 'form-ver-1');
        expect.fail('should have thrown UnprocessableEntityException');
      } catch (err: any) {
        expect(err).toBeInstanceOf(UnprocessableEntityException);
        expect(err.getResponse().errors).toContain('Service agreement');
      }
    });

    it('Should skip querying default agreements if workspaceId is null', async () => {
      // 1. get serviceVersionId
      mockResponse([{ serviceVersionId: 'svc-ver-1' }], documentReferences, 'select');
      // 2. resolveForServiceVersion -> attached agreements
      mockResponse(
        [
          {
            agreementDocumentId: 'agreement-doc-1',
            agreementVersionId: 'agreement-ver-1',
            data: { title: 'Attached Agreement', isOptional: false },
          },
        ],
        documentReferences,
        'select',
      );
      // 3. resolveForServiceVersion -> workspaceId query returns empty (workspaceId is null)
      mockResponse([], documentVersions, 'select');
      // 4. resolveForServiceVersion -> consent check for Attached Agreement (workspaceDefaultAgreements query is skipped)
      mockResponse([{ decision: 'approve' }], serviceAgreementConsents, 'select');

      await expect(
        service.assertSubmittableForForm('user-1', 'form-ver-1'),
      ).resolves.toBeUndefined();
    });
  });
});

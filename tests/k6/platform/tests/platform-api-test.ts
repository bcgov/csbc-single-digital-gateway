import { group } from 'k6';
import { platformCookieData, setCookies, UserType } from '../../utils/cookies.ts';
import { AddMemberBodyRole } from '../utils/enums.ts';
import AdminAuthAPIs from '../utils/admin-api-auth.ts';
import AdminDocumentTypesAPIs from '../utils/admin-api-document-types.ts';
import StaffServiceAgreementsAPIs from '../utils/staff-api-service-agreements.ts';
import StaffServicesAPIs from '../utils/staff-api-services.ts';
import StaffSubmissionsAPIs from '../utils/staff-api-submissions.ts';
import StaffWorkspacesAPIs from '../utils/staff-api-workspaces.ts';
import StaffDocumentTypesAPIs from '../utils/staff-api-document-types.ts';
import StaffDefaultAgreementsAPIs from '../utils/staff-api-default-agreements.ts';
import StaffGeoAPIs from '../utils/staff-api-geo.ts';
import StaffMyNotificationsAPIs from '../utils/staff-api-my-notifications.ts';

/**
 * This is the main entry point for the platform API tests.
 */
export default function platformApiTest(options?: {
  testAdminAuth: boolean;
  testAdminDocumentTypes: boolean;
  testStaffDefaultAgreements: boolean;
  testStaffDocumentTypes: boolean;
  testStaffGeo: boolean;
  testStaffMyNotifications: boolean;
  testStaffServiceAgreements: boolean;
  testStaffServices: boolean;
  testStaffSubmissions: boolean;
  testStaffWorkspaces: boolean;
}) {
  setCookies(platformCookieData, UserType.Platform);

  const documentTypeId = '123e4567-e89b-12d3-a456-426614174000';
  const versionId = '123e4567-e89b-12d3-a456-426614174001';
  const workspaceId = '123e4567-e89b-12d3-a456-426614174002';
  const countryId = '123e4567-e89b-12d3-a456-426614174003';
  const deliveryId = '123e4567-e89b-12d3-a456-426614174004';
  const serviceAgreementId = '123e4567-e89b-12d3-a456-426614174005';
  const documentId = '123e4567-e89b-12d3-a456-426614174006';
  const serviceId = '123e4567-e89b-12d3-a456-426614174007';
  const referenceId = '123e4567-e89b-12d3-a456-426614174008';
  const submissionId = '123e4567-e89b-12d3-a456-426614174009';
  const userId = '123e4567-e89b-12d3-a456-426614174010';
  const memberId = '123e4567-e89b-12d3-a456-426614174011';
  const slug = 'test-workspace';

  if (options?.testAdminAuth) {
    group('Admin API - Auth', () => {
      const adminAuth = new AdminAuthAPIs();
      // IDIR me endpoint
      adminAuth.idirMe();
    });
  }

  if (options?.testAdminDocumentTypes) {
    group('Admin API - Document Types', () => {
      const adminDocumentTypes = new AdminDocumentTypesAPIs();
      // Find all document types endpoint
      adminDocumentTypes.findAllTypes();

      // Create document type endpoint
      adminDocumentTypes.createType(documentTypeId);

      // Create document type version endpoint
      adminDocumentTypes.createVersion(documentTypeId, {
        definition: { sections: [] },
      });

      // Update document type version endpoint
      adminDocumentTypes.updateVersion(documentTypeId, versionId, {
        definition: { sections: [] },
      });

      // Delete document type version endpoint
      adminDocumentTypes.deleteVersion(documentTypeId, versionId);

      // Publish document type version endpoint
      adminDocumentTypes.publishVersion(documentTypeId, versionId);

      // Archive document type version endpoint
      adminDocumentTypes.archiveVersion(documentTypeId, versionId);
    });
  }

  if (options?.testStaffDefaultAgreements) {
    group('Staff API - Default Agreements', () => {
      const staffWorkspaces = new StaffDefaultAgreementsAPIs();
      // Find all default agreements endpoint
      staffWorkspaces.findAllDefaultAgreements(workspaceId);

      // Add default agreement endpoint
      staffWorkspaces.addDefaultAgreement(workspaceId, {
        agreementDocumentId: documentId,
      });

      // Remove default agreement endpoint
      staffWorkspaces.removeDefaultAgreement(workspaceId, documentId);
    });
  }

  if (options?.testStaffDocumentTypes) {
    group('Staff API - Document Types', () => {
      const staffDocumentTypes = new StaffDocumentTypesAPIs();
      // Find all document types endpoint
      staffDocumentTypes.findAllTypes();

      // Find one document type endpoint
      staffDocumentTypes.findOneType(documentTypeId);

      // Find one document type version endpoint
      staffDocumentTypes.findOneTypeVersion(documentTypeId, versionId);
    });
  }

  if (options?.testStaffGeo) {
    group('Staff API - Geo', () => {
      const staffGeo = new StaffGeoAPIs();
      // Find all countries endpoint
      staffGeo.findAllCountries();

      // Find states by country endpoint
      staffGeo.findStatesByCountry(countryId);

      // Find address search regions endpoint
      staffGeo.findAddressSearchRegions();

      // Find address search endpoint
      staffGeo.findAddressSearch();
    });
  }

  if (options?.testStaffMyNotifications) {
    group('Staff API - My Notifications', () => {
      const staffMyNotifications = new StaffMyNotificationsAPIs();

      // Find notifications endpoint
      staffMyNotifications.findNotifications();

      // Find notifications stream endpoint
      staffMyNotifications.findNotificationsStream();

      // Find notifications unread count endpoint
      staffMyNotifications.findNotificationsUnreadCount();

      // Find notifications read all endpoint
      staffMyNotifications.findNotificationsReadAll();

      // Read by delivery ID endpoint
      staffMyNotifications.readByDeliveryId(deliveryId);

      // Get preferences endpoint
      staffMyNotifications.getPreferences();

      // Update preferences endpoint
      staffMyNotifications.updatePreferences();
    });
  }

  if (options?.testStaffServiceAgreements) {
    group('Staff API - Service Agreements', () => {
      const staffServiceAgreements = new StaffServiceAgreementsAPIs();

      // Create agreement endpoint
      staffServiceAgreements.createAgreement({ workspaceId, data: {} });

      // Find all agreements endpoint
      staffServiceAgreements.findAllAgreements(workspaceId);

      // List page endpoint
      staffServiceAgreements.listPage(workspaceId);

      // Find one agreement endpoint
      staffServiceAgreements.findOneAgreement(serviceAgreementId);

      // Update draft version endpoint
      staffServiceAgreements.updateDraftVersion(serviceAgreementId, versionId, {
        data: {},
      });

      // Create version endpoint
      staffServiceAgreements.createVersion(serviceAgreementId);

      // Publish version endpoint
      staffServiceAgreements.publishVersion(serviceAgreementId, versionId);
    });
  }

  if (options?.testStaffServices) {
    group('Staff API - Services', () => {
      const staffServices = new StaffServicesAPIs();

      // Find all services endpoint
      staffServices.findAllServices(workspaceId);

      // Create service endpoint
      staffServices.createService({
        workspaceId,
        title: 'Test Service',
        data: {},
      });

      // Get definition endpoint
      staffServices.getDefinition();

      // List forms endpoint
      staffServices.listForms(workspaceId);

      // Find one service endpoint
      staffServices.findOneService(serviceId);

      // Delete service endpoint
      staffServices.deleteService(serviceId);

      // Archive service endpoint
      staffServices.archiveService(serviceId);

      // Reactivate service endpoint
      staffServices.reactivateService(serviceId);

      // Update draft version endpoint
      staffServices.updateDraftVersion(serviceId, versionId, {
        data: {},
        title: 'Updated Service',
      });

      // Discard version endpoint
      staffServices.discardVersion(serviceId, versionId);

      // Publish version endpoint
      staffServices.publishVersion(serviceId, versionId);

      // Archive version endpoint
      staffServices.archiveVersion(serviceId, versionId);

      // Add version endpoint
      staffServices.addVersion(serviceId);

      // List references endpoint
      staffServices.listReferences(serviceId, versionId);

      // Add reference endpoint
      staffServices.addReference(serviceId, versionId, {
        targetVersionId: versionId,
        relation: 'form',
      });

      // Remove reference endpoint
      staffServices.removeReference(serviceId, versionId, referenceId);

      // Archive reference endpoint
      staffServices.archiveReference(serviceId, versionId, referenceId);

      // Create referenced form endpoint
      staffServices.createReferencedForm(serviceId, versionId, {
        typeId: documentTypeId,
        title: 'Test Form',
        definition: {},
      });

      // Create external application endpoint
      staffServices.createExternalApplication(serviceId, versionId, {
        label: 'External App',
        url: 'https://example.com',
      });

      // Update external application endpoint
      staffServices.updateExternalApplication(serviceId, versionId, referenceId, {
        label: 'Updated External App',
      });

      // List agreements endpoint
      staffServices.listAgreements(serviceId, versionId);

      // Attach agreement endpoint
      staffServices.attachAgreement(serviceId, versionId, {
        agreementDocumentId: documentId,
      });

      // Detach agreement endpoint
      staffServices.detachAgreement(serviceId, versionId, referenceId);
    });
  }
  if (options?.testStaffSubmissions) {
    group('Staff API - Submissions', () => {
      const staffSubmissions = new StaffSubmissionsAPIs();

      // Find all submissions endpoint
      staffSubmissions.findAllSubmissions(workspaceId);

      // Find one submission endpoint
      staffSubmissions.findOneSubmission(submissionId);

      // Review submission endpoint
      staffSubmissions.reviewSubmission(submissionId, {
        decision: 'approve',
        reason: 'Looks good',
      });
    });
  }
  if (options?.testStaffWorkspaces) {
    group('Staff API - Workspaces', () => {
      const staffWorkspaces = new StaffWorkspacesAPIs();

      // Find all workspaces endpoint
      staffWorkspaces.findAllWorkspaces();

      // Create workspace endpoint
      staffWorkspaces.createWorkspace({
        name: 'Test Workspace',
        description: 'Test Description',
      });

      // Get workspace by slug endpoint
      staffWorkspaces.getWorkspaceBySlug(slug);

      // Find one workspace endpoint
      staffWorkspaces.findOneWorkspace(workspaceId);

      // Update workspace endpoint
      staffWorkspaces.updateWorkspace(workspaceId, {
        name: 'Updated Workspace',
      });

      // Delete workspace endpoint
      staffWorkspaces.deleteWorkspace(workspaceId);

      // Get members endpoint
      staffWorkspaces.getMembers(workspaceId);

      // List members page endpoint
      staffWorkspaces.listMembersPage(workspaceId);

      // List addable staff endpoint
      staffWorkspaces.listAddableStaff(workspaceId);

      // Add member endpoint
      staffWorkspaces.addMember(workspaceId, {
        userId,
        role: AddMemberBodyRole.Admin,
      });

      // Update member endpoint
      staffWorkspaces.updateMember(workspaceId, memberId, {
        role: AddMemberBodyRole.Admin,
      });

      // Transfer ownership endpoint
      staffWorkspaces.transferOwnership(workspaceId, {
        userId,
      });

      // Find all default agreements endpoint
      staffWorkspaces.findAllDefaultAgreements(workspaceId);

      // Add default agreement endpoint
      staffWorkspaces.addDefaultAgreement(workspaceId, {
        agreementDocumentId: documentId,
      });

      // Remove default agreement endpoint
      staffWorkspaces.removeDefaultAgreement(workspaceId, documentId);
    });
  }
}

import { group } from "k6";
import { idirCookieData, setCookies, UserType } from "../../utils/cookies.ts";
import { adminAuthIdirMe } from "../utils/admin-api-auth.ts";
import {
  adminConsentDocumentTypesArchiveVersion,
  adminConsentDocumentTypesCreateType,
  adminConsentDocumentTypesCreateVersions,
  adminConsentDocumentTypesDeleteType,
  adminConsentDocumentTypesFindOneType,
  adminConsentDocumentTypesFindOneVersion,
  adminConsentDocumentTypesGetPublishedTypes,
  adminConsentDocumentTypesPublishVersion,
  adminConsentDocumentTypessFindAllTypes,
  adminConsentDocumentTypesUpsertTranslation,
} from "../utils/admin-api-consent-document-types.ts";
import {
  adminConsentDocumentsAddContributors,
  adminConsentDocumentsArchiveVersion,
  adminConsentDocumentsCreateDocument,
  adminConsentDocumentsCreateVersions,
  adminConsentDocumentsDeleteDocument,
  adminConsentDocumentsFindAllDocuments,
  adminConsentDocumentsFindOneDocument,
  adminConsentDocumentsFindOneVersion,
  adminConsentDocumentsGetContributors,
  adminConsentDocumentsPublishVersion,
  adminConsentDocumentsRemoveContributor,
  adminConsentDocumentsUpsertTranslation,
} from "../utils/admin-api-consent-documents.ts";
import {
  adminOrgUnitsAddMember,
  adminOrgUnitsCreateChild,
  adminOrgUnitsFindAllOrgUnits,
  adminOrgUnitsFindOneOrgUnit,
  adminOrgUnitsGetChildren,
  adminOrgUnitsGetChildrenTypes,
  adminOrgUnitsGetMembers,
  adminOrgUnitsRemoveMember,
  adminOrgUnitsSearchUsers,
} from "../utils/admin-api-org-units.ts";
import {
  adminServiceTypesArchiveVersion,
  adminServiceTypesCreateType,
  adminServiceTypesCreateVersion,
  adminServiceTypesDeleteOneType,
  adminServiceTypesFindAllPublished,
  adminServiceTypesFindAllTypes,
  adminServiceTypesFindOneType,
  adminServiceTypesGetVersion,
  adminServiceTypesPublishVersion,
  adminServiceTypesUpsertTranslation,
} from "../utils/admin-api-service-types.ts";
import {
  adminServicesAddContributor,
  adminServicesArchiveVersion,
  adminServicesCreateService,
  adminServicesCreateVersion,
  adminServicesDeleteService,
  adminServicesFindAllServices,
  adminServicesFindOneService,
  adminServicesFindOneVersion,
  adminServicesGetContributors,
  adminServicesPublishVersion,
  adminServicesRemoveContributor,
  adminServicesUpsertTranslation,
} from "../utils/admin-api-services.ts";
import {
  AddMemberBodyRole,
  CreateChildOrgUnitBodyType,
} from "../utils/enums.ts";

/**
 * This is the main entry point for the admin API tests.
 */
export default function adminApiTest(
  testServices: boolean,
  testOrgUnits: boolean,
  testServiceTypes: boolean,
  testConsentDocuments: boolean,
  testConsentDocumentTypes: boolean,
) {
  setCookies(idirCookieData, UserType.Admin);

  const serviceId = "123e4567-e89b-12d3-a456-426614174000";
  const versionId = "123e4567-e89b-12d3-a456-426614174001";
  const orgUnitId = "123e4567-e89b-12d3-a456-426614174002";
  const userId = "123e4567-e89b-12d3-a456-426614174003";
  const memberId = "123e4567-e89b-12d3-a456-426614174004";
  const serviceTypeId = "123e4567-e89b-12d3-a456-426614174005";
  const documentId = "123e4567-e89b-12d3-a456-426614174006";
  const typeId = "123e4567-e89b-12d3-a456-426614174007";
  const locale = "en";
  const requestBody = {
    name: "Test Service",
    description: "A test service for smoke testing",
  };

  // IDIR/Me endpoint
  adminAuthIdirMe();

  if (testServices) {
    group("Admin API - Services", () => {
      // Find all services
      adminServicesFindAllServices();

      // FindOne
      adminServicesFindOneService(serviceId);

      // Create service
      adminServicesCreateService(serviceTypeId, orgUnitId, requestBody);

      // Find one version
      adminServicesFindOneVersion(serviceId, versionId);

      // Create version
      adminServicesCreateVersion(serviceId);

      // Translate version
      adminServicesUpsertTranslation(serviceId, versionId, locale);

      // Publish version
      adminServicesPublishVersion(serviceId, versionId);

      // Archive version
      adminServicesArchiveVersion(serviceId, versionId);

      // Get contributors
      adminServicesGetContributors(serviceId);

      // Add contributor
      adminServicesAddContributor(serviceId);

      // Delete service
      adminServicesDeleteService(serviceId);

      // Remove contributor
      adminServicesRemoveContributor(serviceId, userId);
    });
  }

  if (testOrgUnits) {
    group("Admin API - Organization Units", () => {
      // Find all org-units
      adminOrgUnitsFindAllOrgUnits();

      // Find one org-unit
      adminOrgUnitsFindOneOrgUnit(orgUnitId);

      // Get children
      adminOrgUnitsGetChildren(orgUnitId);

      // Create child
      adminOrgUnitsCreateChild(orgUnitId, {
        name: "Test Child",
        type: CreateChildOrgUnitBodyType.Branch,
      });

      // Get children types
      adminOrgUnitsGetChildrenTypes(orgUnitId);

      // Get members
      adminOrgUnitsGetMembers(orgUnitId);

      // Search users
      adminOrgUnitsSearchUsers(orgUnitId);

      // Add member
      adminOrgUnitsAddMember(orgUnitId, {
        userId,
        role: AddMemberBodyRole.Admin,
      });

      // Remove member
      adminOrgUnitsRemoveMember(orgUnitId, memberId);
    });
  }

  if (testServiceTypes) {
    group("Admin API - Service Types", () => {
      // Find all types
      adminServiceTypesFindAllTypes();

      // Create type
      adminServiceTypesCreateType(requestBody);

      // Find all published types
      adminServiceTypesFindAllPublished();

      // Find one type
      adminServiceTypesFindOneType(serviceTypeId);

      // Delete one type
      adminServiceTypesDeleteOneType(serviceTypeId);

      // Upsert translation
      adminServiceTypesUpsertTranslation(serviceTypeId, locale, requestBody);

      // Get version
      adminServiceTypesGetVersion(serviceTypeId, versionId);

      // Create version
      adminServiceTypesCreateVersion(serviceTypeId);

      // Publish version
      adminServiceTypesPublishVersion(serviceTypeId, versionId);

      // Archive version
      adminServiceTypesArchiveVersion(serviceTypeId, versionId);
    });
  }

  if (testConsentDocuments) {
    group("Admin API - Consent Documents", () => {
      // Find all documents
      adminConsentDocumentsFindAllDocuments();

      // Create document
      adminConsentDocumentsCreateDocument(requestBody);

      // Find one document
      adminConsentDocumentsFindOneDocument(documentId);

      // Create version
      adminConsentDocumentsCreateVersions(documentId);

      // Find one version
      adminConsentDocumentsFindOneVersion(documentId, versionId);

      // Upsert translation
      adminConsentDocumentsUpsertTranslation(
        documentId,
        versionId,
        locale,
        requestBody,
      );

      // Publish version
      adminConsentDocumentsPublishVersion(documentId, versionId);

      // Archive version
      adminConsentDocumentsArchiveVersion(documentId, versionId);

      // Get contributors
      adminConsentDocumentsGetContributors(documentId);

      // Add contributor
      adminConsentDocumentsAddContributors(documentId);

      // Delete document
      adminConsentDocumentsDeleteDocument(documentId);

      // Remove contributor
      adminConsentDocumentsRemoveContributor(documentId, userId);
    });
  }

  if (testConsentDocumentTypes) {
    group("Admin API - Consent Document Types", () => {
      // Find all types endpoint
      adminConsentDocumentTypessFindAllTypes();

      // Create type endpoint
      adminConsentDocumentTypesCreateType(requestBody);

      // Get published types endpoint
      adminConsentDocumentTypesGetPublishedTypes(typeId);

      // Find one type endpoint
      adminConsentDocumentTypesFindOneType(typeId);

      // Delete type endpoint
      adminConsentDocumentTypesDeleteType(typeId);

      // Create version endpoint
      adminConsentDocumentTypesCreateVersions(typeId);

      // Find one version endpoint
      adminConsentDocumentTypesFindOneVersion(typeId, versionId);

      // Upsert translation endpoint
      adminConsentDocumentTypesUpsertTranslation(
        typeId,
        versionId,
        locale,
        requestBody,
      );

      // Publish version endpoint
      adminConsentDocumentTypesPublishVersion(typeId, versionId);

      // Archive version endpoint
      adminConsentDocumentTypesArchiveVersion(typeId, versionId);
    });
  }
}

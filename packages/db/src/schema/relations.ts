import { relations } from "drizzle-orm";
import { identities } from "./auth.ts";
import {
  consentDocumentContributors,
  consentDocuments,
  consentDocumentTypes,
  consentDocumentTypeVersions,
  consentDocumentTypeVersionTranslations,
  consentDocumentVersions,
  consentDocumentVersionTranslations,
  consentStatements,
} from "./consent-management.ts";
import {
  orgUnitMembers,
  orgUnitRelations as orgUnitRelationsTable,
  orgUnits,
} from "./organizations.ts";
import {
  serviceContributors,
  services,
  serviceTypes,
  serviceTypeVersions,
  serviceTypeVersionTranslations,
  serviceVersions,
  serviceVersionTranslations,
} from "./service-catalogue.ts";
import { users } from "./users.ts";

export const usersRelations = relations(users, ({ many }) => ({
  identities: many(identities),
  orgUnitMemberships: many(orgUnitMembers),
  consentDocumentContributions: many(consentDocumentContributors),
  consentStatements: many(consentStatements),
  serviceContributions: many(serviceContributors),
}));

export const identitiesRelations = relations(identities, ({ one }) => ({
  user: one(users, {
    fields: [identities.userId],
    references: [users.id],
  }),
}));

// Organization relations

export const orgUnitsRelations = relations(orgUnits, ({ many }) => ({
  members: many(orgUnitMembers),
  ancestorRelations: many(orgUnitRelationsTable, {
    relationName: "descendant",
  }),
  descendantRelations: many(orgUnitRelationsTable, {
    relationName: "ancestor",
  }),
  consentDocuments: many(consentDocuments),
  services: many(services),
}));

export const orgUnitMembersRelations = relations(
  orgUnitMembers,
  ({ one }) => ({
    orgUnit: one(orgUnits, {
      fields: [orgUnitMembers.orgUnitId],
      references: [orgUnits.id],
    }),
    user: one(users, {
      fields: [orgUnitMembers.userId],
      references: [users.id],
    }),
  }),
);

export const orgUnitRelationsRelations = relations(
  orgUnitRelationsTable,
  ({ one }) => ({
    ancestor: one(orgUnits, {
      fields: [orgUnitRelationsTable.ancestorId],
      references: [orgUnits.id],
      relationName: "ancestor",
    }),
    descendant: one(orgUnits, {
      fields: [orgUnitRelationsTable.descendantId],
      references: [orgUnits.id],
      relationName: "descendant",
    }),
  }),
);

// Consent management relations

export const consentDocumentsRelations = relations(
  consentDocuments,
  ({ one, many }) => ({
    consentDocumentType: one(consentDocumentTypes, {
      fields: [consentDocuments.consentDocumentTypeId],
      references: [consentDocumentTypes.id],
    }),
    orgUnit: one(orgUnits, {
      fields: [consentDocuments.orgUnitId],
      references: [orgUnits.id],
    }),
    publishedVersion: one(consentDocumentVersions, {
      fields: [consentDocuments.publishedConsentDocumentVersionId],
      references: [consentDocumentVersions.id],
      relationName: "publishedConsentDocumentVersion",
    }),
    contributors: many(consentDocumentContributors),
    versions: many(consentDocumentVersions, {
      relationName: "consentDocumentVersions",
    }),
  }),
);

export const consentDocumentContributorsRelations = relations(
  consentDocumentContributors,
  ({ one }) => ({
    consentDocument: one(consentDocuments, {
      fields: [consentDocumentContributors.consentDocumentId],
      references: [consentDocuments.id],
    }),
    user: one(users, {
      fields: [consentDocumentContributors.userId],
      references: [users.id],
    }),
  }),
);

export const consentDocumentTypesRelations = relations(
  consentDocumentTypes,
  ({ one, many }) => ({
    publishedVersion: one(consentDocumentTypeVersions, {
      fields: [consentDocumentTypes.publishedConsentDocumentTypeVersionId],
      references: [consentDocumentTypeVersions.id],
      relationName: "publishedConsentDocumentTypeVersion",
    }),
    consentDocuments: many(consentDocuments),
    versions: many(consentDocumentTypeVersions, {
      relationName: "consentDocumentTypeVersions",
    }),
  }),
);

export const consentDocumentTypeVersionsRelations = relations(
  consentDocumentTypeVersions,
  ({ one, many }) => ({
    consentDocumentType: one(consentDocumentTypes, {
      fields: [consentDocumentTypeVersions.consentDocumentTypeId],
      references: [consentDocumentTypes.id],
      relationName: "consentDocumentTypeVersions",
    }),
    translations: many(consentDocumentTypeVersionTranslations),
    consentDocumentVersions: many(consentDocumentVersions),
  }),
);

export const consentDocumentTypeVersionTranslationsRelations = relations(
  consentDocumentTypeVersionTranslations,
  ({ one }) => ({
    consentDocumentTypeVersion: one(consentDocumentTypeVersions, {
      fields: [
        consentDocumentTypeVersionTranslations.consentDocumentTypeVersionId,
      ],
      references: [consentDocumentTypeVersions.id],
    }),
  }),
);

export const consentDocumentVersionsRelations = relations(
  consentDocumentVersions,
  ({ one, many }) => ({
    consentDocument: one(consentDocuments, {
      fields: [consentDocumentVersions.consentDocumentId],
      references: [consentDocuments.id],
      relationName: "consentDocumentVersions",
    }),
    consentDocumentTypeVersion: one(consentDocumentTypeVersions, {
      fields: [consentDocumentVersions.consentDocumentTypeVersionId],
      references: [consentDocumentTypeVersions.id],
    }),
    translations: many(consentDocumentVersionTranslations),
    consentStatements: many(consentStatements),
  }),
);

export const consentDocumentVersionTranslationsRelations = relations(
  consentDocumentVersionTranslations,
  ({ one }) => ({
    consentDocumentVersion: one(consentDocumentVersions, {
      fields: [consentDocumentVersionTranslations.consentDocumentVersionId],
      references: [consentDocumentVersions.id],
    }),
  }),
);

export const consentStatementsRelations = relations(
  consentStatements,
  ({ one }) => ({
    consentDocumentVersion: one(consentDocumentVersions, {
      fields: [consentStatements.consentDocumentVersionId],
      references: [consentDocumentVersions.id],
    }),
    user: one(users, {
      fields: [consentStatements.userId],
      references: [users.id],
    }),
  }),
);

// Service catalogue relations

export const servicesRelations = relations(services, ({ one, many }) => ({
  orgUnit: one(orgUnits, {
    fields: [services.orgUnitId],
    references: [orgUnits.id],
  }),
  publishedVersion: one(serviceVersions, {
    fields: [services.publishedServiceVersionId],
    references: [serviceVersions.id],
    relationName: "publishedServiceVersion",
  }),
  serviceType: one(serviceTypes, {
    fields: [services.serviceTypeId],
    references: [serviceTypes.id],
  }),
  contributors: many(serviceContributors),
  versions: many(serviceVersions, { relationName: "serviceVersions" }),
}));

export const serviceContributorsRelations = relations(
  serviceContributors,
  ({ one }) => ({
    service: one(services, {
      fields: [serviceContributors.serviceId],
      references: [services.id],
    }),
    user: one(users, {
      fields: [serviceContributors.userId],
      references: [users.id],
    }),
  }),
);

export const serviceTypesRelations = relations(
  serviceTypes,
  ({ one, many }) => ({
    publishedVersion: one(serviceTypeVersions, {
      fields: [serviceTypes.publishedServiceTypeVersionId],
      references: [serviceTypeVersions.id],
      relationName: "publishedServiceTypeVersion",
    }),
    services: many(services),
    versions: many(serviceTypeVersions, {
      relationName: "serviceTypeVersions",
    }),
  }),
);

export const serviceTypeVersionsRelations = relations(
  serviceTypeVersions,
  ({ one, many }) => ({
    serviceType: one(serviceTypes, {
      fields: [serviceTypeVersions.serviceTypeId],
      references: [serviceTypes.id],
      relationName: "serviceTypeVersions",
    }),
    translations: many(serviceTypeVersionTranslations),
    serviceVersions: many(serviceVersions),
  }),
);

export const serviceTypeVersionTranslationsRelations = relations(
  serviceTypeVersionTranslations,
  ({ one }) => ({
    serviceTypeVersion: one(serviceTypeVersions, {
      fields: [serviceTypeVersionTranslations.serviceTypeVersionId],
      references: [serviceTypeVersions.id],
    }),
  }),
);

export const serviceVersionsRelations = relations(
  serviceVersions,
  ({ one, many }) => ({
    serviceTypeVersion: one(serviceTypeVersions, {
      fields: [serviceVersions.serviceTypeVersionId],
      references: [serviceTypeVersions.id],
    }),
    service: one(services, {
      fields: [serviceVersions.serviceId],
      references: [services.id],
      relationName: "serviceVersions",
    }),
    translations: many(serviceVersionTranslations),
  }),
);

export const serviceVersionTranslationsRelations = relations(
  serviceVersionTranslations,
  ({ one }) => ({
    serviceVersion: one(serviceVersions, {
      fields: [serviceVersionTranslations.serviceVersionId],
      references: [serviceVersions.id],
    }),
  }),
);

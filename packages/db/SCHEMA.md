# Database Schema

> Auto-generated from `packages/db/src/schema/`. Do not edit manually — run `npm run db:generate-docs` to regenerate.

### Relationship Diagram (Mermaid)

```mermaid
erDiagram
    user_roles {
        uuid userId PK,FK "not null, → users.id (cascade)"
        role role PK "no default - caller supplied"
        timestamptz createdAt "not null, defaultNow()"
    }

    users {
        uuid id PK "defaultRandom()"
        text name "nullable"
        text email "nullable"
        timestamptz createdAt "not null, defaultNow()"
        timestamptz updatedAt "not null, defaultNow(), auto-updated"
    }

    identities {
        uuid id PK "defaultRandom()"
        uuid userId FK "nullable, → users.id (cascade)"
        text issuer "not null"
        text sub "not null"
        jsonb claims "not null, {}"
        timestamptz createdAt "not null, defaultNow()"
        timestamptz updatedAt "not null, defaultNow(), auto-updated"
    }

    org_unit_members {
        uuid orgUnitId PK,FK "not null, → org_units.id (cascade)"
        uuid userId PK,FK "not null, → users.id (cascade)"
        org_unit_member_role role "not null, enum(admin,member)"
        timestamptz createdAt "not null, defaultNow()"
        timestamptz updatedAt "not null, defaultNow(), auto-updated"
    }

    org_unit_relations {
        uuid ancestorId PK,FK "not null, → org_units.id (cascade)"
        uuid descendantId PK,FK "not null, → org_units.id (cascade)"
        integer depth "not null"
        timestamptz createdAt "not null, defaultNow()"
        timestamptz updatedAt "not null, defaultNow(), auto-updated"
    }

    org_units {
        uuid id PK "defaultRandom()"
        text name "not null"
        org_unit_type type "not null, enum(org,division,branch,team)"
        timestamptz createdAt "not null, defaultNow()"
        timestamptz updatedAt "not null, defaultNow(), auto-updated"
    }

    schema_versions {
        uuid id PK "defaultRandom()"
        uuid schemaId FK "not null, → schemas.id (cascade)"
        integer version "not null"
        jsonb schema "not null, {}"
        jsonb uiSchema "not null, {}"
        timestamptz createdAt "not null, defaultNow()"
        timestamptz updatedAt "not null, defaultNow(), auto-updated"
    }

    schemas {
        uuid id PK "defaultRandom()"
        uuid publishedSchemaVersionId FK "nullable, → schema_versions.id (set null)"
        timestamptz createdAt "not null, defaultNow()"
        timestamptz updatedAt "not null, defaultNow(), auto-updated"
    }

    consent_document_contributors {
        uuid consentDocumentId PK,FK "not null, → consent_documents.id (cascade)"
        uuid userId PK,FK "not null, → users.id (cascade)"
        consent_document_contributor_role role "not null, enum(owner)"
        timestamptz createdAt "not null, defaultNow()"
        timestamptz updatedAt "not null, defaultNow(), auto-updated"
    }

    consent_document_types {
        uuid id PK "defaultRandom()"
        uuid schemaId FK "nullable, unique, → schemas.id (no action)"
        text name "not null"
        text description "nullable"
        timestamptz createdAt "not null, defaultNow()"
        timestamptz updatedAt "not null, defaultNow(), auto-updated"
    }

    consent_document_version_translations {
        uuid id PK "defaultRandom()"
        uuid consentDocumentVersionId FK "not null, → consent_document_versions.id (cascade)"
        text locale "not null"
        jsonb content "not null, {}"
        timestamptz createdAt "not null, defaultNow()"
        timestamptz updatedAt "not null, defaultNow(), auto-updated"
    }

    consent_document_versions {
        uuid id PK "defaultRandom()"
        uuid consentDocumentId FK "not null, → consent_documents.id (cascade)"
        uuid schemaVersionId FK "not null, → schema_versions.id (no action)"
        integer version "not null"
        consent_document_version_status status "not null, enum(draft,published,archived)"
        timestamptz archivedAt "nullable"
        timestamptz publishedAt "nullable"
        timestamptz createdAt "not null, defaultNow()"
        timestamptz updatedAt "not null, defaultNow(), auto-updated"
    }

    consent_documents {
        uuid id PK "defaultRandom()"
        uuid consentDocumentTypeId FK "not null, → consent_document_types.id (no action)"
        uuid orgUnitId FK "not null, → org_units.id (no action)"
        uuid publishedConsentDocumentVersionId FK "nullable, → consent_document_versions.id (set null)"
        timestamptz createdAt "not null, defaultNow()"
        timestamptz updatedAt "not null, defaultNow(), auto-updated"
    }

    consent_statements {
        uuid id PK "no default - caller supplied"
        uuid consentDocumentVersionId FK "not null, → consent_document_versions.id (cascade)"
        uuid userId FK "not null, → users.id (cascade)"
        consent_statement_action action "not null, enum(approve,deny,revoke)"
        timestamptz createdAt "not null, defaultNow()"
    }

    service_contributors {
        uuid serviceId PK,FK "not null, → services.id (cascade)"
        uuid userId PK,FK "not null, → users.id (cascade)"
        service_contributor_role role "not null, enum(owner)"
        timestamptz createdAt "not null, defaultNow()"
        timestamptz updatedAt "not null, defaultNow(), auto-updated"
    }

    service_types {
        uuid id PK "defaultRandom()"
        uuid schemaId FK "not null, → schemas.id (no action)"
        text name "not null"
        text description "nullable"
        timestamptz createdAt "not null, defaultNow()"
        timestamptz updatedAt "not null, defaultNow(), auto-updated"
    }

    service_version_translations {
        uuid id PK "defaultRandom()"
        uuid serviceVersionId FK "not null, → service_versions.id (cascade)"
        text locale "not null"
        jsonb content "not null, {}"
        timestamptz createdAt "not null, defaultNow()"
        timestamptz updatedAt "not null, defaultNow(), auto-updated"
    }

    service_versions {
        uuid id PK "defaultRandom()"
        uuid schemaVersionId FK "not null, → schema_versions.id (no action)"
        uuid serviceId FK "not null, → services.id (cascade)"
        integer version "not null"
        service_version_status status "not null, enum(draft,published,archived)"
        timestamptz archivedAt "nullable"
        timestamptz publishedAt "nullable"
        timestamptz createdAt "not null, defaultNow()"
        timestamptz updatedAt "not null, defaultNow(), auto-updated"
    }

    services {
        uuid id PK "defaultRandom()"
        uuid orgUnitId FK "not null, → org_units.id (no action)"
        uuid publishedServiceVersionId FK "nullable, → service_versions.id (set null)"
        uuid serviceTypeId FK "not null, unique, → service_types.id (no action)"
        timestamptz createdAt "not null, defaultNow()"
        timestamptz updatedAt "not null, defaultNow(), auto-updated"
    }

    users ||--o{ user_roles : "has many"
    users ||--o{ identities : "has many"
    org_units ||--o{ org_unit_members : "has many"
    users ||--o{ org_unit_members : "has many"
    org_units ||--o{ org_unit_relations : "has many"
    schemas ||--o{ schema_versions : "has many"
    schema_versions ||--o{ schemas : "has many"
    consent_documents ||--o{ consent_document_contributors : "has many"
    users ||--o{ consent_document_contributors : "has many"
    schemas ||--o{ consent_document_types : "has many"
    consent_document_versions ||--o{ consent_document_version_translations : "has many"
    consent_documents ||--o{ consent_document_versions : "has many"
    schema_versions ||--o{ consent_document_versions : "has many"
    consent_document_types ||--o{ consent_documents : "has many"
    org_units ||--o{ consent_documents : "has many"
    consent_document_versions ||--o{ consent_documents : "has many"
    consent_document_versions ||--o{ consent_statements : "has many"
    users ||--o{ consent_statements : "has many"
    services ||--o{ service_contributors : "has many"
    users ||--o{ service_contributors : "has many"
    schemas ||--o{ service_types : "has many"
    service_versions ||--o{ service_version_translations : "has many"
    schema_versions ||--o{ service_versions : "has many"
    services ||--o{ service_versions : "has many"
    org_units ||--o{ services : "has many"
    service_versions ||--o{ services : "has many"
    service_types ||--o{ services : "has many"
```

## Overview

| Table | Source File |
| --- | --- |
| `user_roles` | `schema/users.ts` |
| `users` | `schema/users.ts` |
| `identities` | `schema/auth.ts` |
| `org_unit_members` | `schema/organizations.ts` |
| `org_unit_relations` | `schema/organizations.ts` |
| `org_units` | `schema/organizations.ts` |
| `schema_versions` | `schema/schemas.ts` |
| `schemas` | `schema/schemas.ts` |
| `consent_document_contributors` | `schema/consent-management.ts` |
| `consent_document_types` | `schema/consent-management.ts` |
| `consent_document_version_translations` | `schema/consent-management.ts` |
| `consent_document_versions` | `schema/consent-management.ts` |
| `consent_documents` | `schema/consent-management.ts` |
| `consent_statements` | `schema/consent-management.ts` |
| `service_contributors` | `schema/service-catalogue.ts` |
| `service_types` | `schema/service-catalogue.ts` |
| `service_version_translations` | `schema/service-catalogue.ts` |
| `service_versions` | `schema/service-catalogue.ts` |
| `services` | `schema/service-catalogue.ts` |

## Enums

### role
**Values:** `admin`, `staff`, `citizen`

### org_unit_member_role
**Values:** `admin`, `member`

### org_unit_type
**Values:** `org`, `division`, `branch`, `team`

### consent_document_contributor_role
**Values:** `owner`

### consent_document_version_status
**Values:** `draft`, `published`, `archived`

### consent_statement_action
**Values:** `approve`, `deny`, `revoke`

### service_contributor_role
**Values:** `owner`

### service_version_status
**Values:** `draft`, `published`, `archived`

## Tables

### user_roles

| Column | Type | Nullable | Default | Notes | Comments |
| --- | --- | --- | --- | --- | --- |
| `userId` | uuid | NO |  | PK, FK |  |
| `role` | role | NO |  | PK, enum(admin,staff,citizen) |  |
| `createdAt` | timestamptz | NO | `defaultNow()` |  |  |

**Primary Key:** (`userId`, `role`) — composite
**Foreign Keys:**
- `userId` → `users.id` (on delete: cascade)

---

### users

| Column | Type | Nullable | Default | Notes | Comments |
| --- | --- | --- | --- | --- | --- |
| `id` | uuid | NO | `defaultRandom()` | PK |  |
| `name` | text | YES |  |  |  |
| `email` | text | YES |  |  |  |
| `createdAt` | timestamptz | NO | `defaultNow()` |  |  |
| `updatedAt` | timestamptz | NO | `defaultNow()` | auto-updated |  |

**Primary Key:** `id`

---

### identities

| Column | Type | Nullable | Default | Notes | Comments |
| --- | --- | --- | --- | --- | --- |
| `id` | uuid | NO | `defaultRandom()` | PK |  |
| `userId` | uuid | YES |  | FK |  |
| `issuer` | text | NO |  |  |  |
| `sub` | text | NO |  |  |  |
| `claims` | jsonb | NO | `{}` |  |  |
| `createdAt` | timestamptz | NO | `defaultNow()` |  |  |
| `updatedAt` | timestamptz | NO | `defaultNow()` | auto-updated |  |

**Primary Key:** `id`
**Foreign Keys:**
- `userId` → `users.id` (on delete: cascade)

**Indexes:**
- `identities_issuer_sub_unique` — unique on (`issuer`, `sub`)

---

### org_unit_members

| Column | Type | Nullable | Default | Notes | Comments |
| --- | --- | --- | --- | --- | --- |
| `orgUnitId` | uuid | NO |  | PK, FK |  |
| `userId` | uuid | NO |  | PK, FK |  |
| `role` | org_unit_member_role | NO |  | enum(admin,member) |  |
| `createdAt` | timestamptz | NO | `defaultNow()` |  |  |
| `updatedAt` | timestamptz | NO | `defaultNow()` | auto-updated |  |

**Primary Key:** (`orgUnitId`, `userId`) — composite
**Foreign Keys:**
- `orgUnitId` → `org_units.id` (on delete: cascade)
- `userId` → `users.id` (on delete: cascade)

---

### org_unit_relations

| Column | Type | Nullable | Default | Notes | Comments |
| --- | --- | --- | --- | --- | --- |
| `ancestorId` | uuid | NO |  | PK, FK |  |
| `descendantId` | uuid | NO |  | PK, FK |  |
| `depth` | integer | NO |  |  |  |
| `createdAt` | timestamptz | NO | `defaultNow()` |  |  |
| `updatedAt` | timestamptz | NO | `defaultNow()` | auto-updated |  |

**Primary Key:** (`ancestorId`, `descendantId`) — composite
**Foreign Keys:**
- `ancestorId` → `org_units.id` (on delete: cascade)
- `descendantId` → `org_units.id` (on delete: cascade)

---

### org_units

| Column | Type | Nullable | Default | Notes | Comments |
| --- | --- | --- | --- | --- | --- |
| `id` | uuid | NO | `defaultRandom()` | PK |  |
| `name` | text | NO |  |  |  |
| `type` | org_unit_type | NO |  | enum(org,division,branch,team) |  |
| `createdAt` | timestamptz | NO | `defaultNow()` |  |  |
| `updatedAt` | timestamptz | NO | `defaultNow()` | auto-updated |  |

**Primary Key:** `id`

---

### schema_versions

| Column | Type | Nullable | Default | Notes | Comments |
| --- | --- | --- | --- | --- | --- |
| `id` | uuid | NO | `defaultRandom()` | PK |  |
| `schemaId` | uuid | NO |  | FK |  |
| `version` | integer | NO |  |  |  |
| `schema` | jsonb | NO | `{}` |  |  |
| `uiSchema` | jsonb | NO | `{}` |  |  |
| `createdAt` | timestamptz | NO | `defaultNow()` |  |  |
| `updatedAt` | timestamptz | NO | `defaultNow()` | auto-updated |  |

**Primary Key:** `id`
**Foreign Keys:**
- `schemaId` → `schemas.id` (on delete: cascade)

**Indexes:**
- `schema_versions_schema_version_unique` — unique on (`schemaId`, `version`)

---

### schemas

| Column | Type | Nullable | Default | Notes | Comments |
| --- | --- | --- | --- | --- | --- |
| `id` | uuid | NO | `defaultRandom()` | PK |  |
| `publishedSchemaVersionId` | uuid | YES |  | FK |  |
| `createdAt` | timestamptz | NO | `defaultNow()` |  |  |
| `updatedAt` | timestamptz | NO | `defaultNow()` | auto-updated |  |

**Primary Key:** `id`
**Foreign Keys:**
- `publishedSchemaVersionId` → `schema_versions.id` (on delete: set null)

---

### consent_document_contributors

| Column | Type | Nullable | Default | Notes | Comments |
| --- | --- | --- | --- | --- | --- |
| `consentDocumentId` | uuid | NO |  | PK, FK |  |
| `userId` | uuid | NO |  | PK, FK |  |
| `role` | consent_document_contributor_role | NO |  | enum(owner) |  |
| `createdAt` | timestamptz | NO | `defaultNow()` |  |  |
| `updatedAt` | timestamptz | NO | `defaultNow()` | auto-updated |  |

**Primary Key:** (`consentDocumentId`, `userId`) — composite
**Foreign Keys:**
- `consentDocumentId` → `consent_documents.id` (on delete: cascade)
- `userId` → `users.id` (on delete: cascade)

---

### consent_document_types

| Column | Type | Nullable | Default | Notes | Comments |
| --- | --- | --- | --- | --- | --- |
| `id` | uuid | NO | `defaultRandom()` | PK |  |
| `schemaId` | uuid | YES |  | FK, unique |  |
| `name` | text | NO |  |  |  |
| `description` | text | YES |  |  |  |
| `createdAt` | timestamptz | NO | `defaultNow()` |  |  |
| `updatedAt` | timestamptz | NO | `defaultNow()` | auto-updated |  |

**Primary Key:** `id`
**Foreign Keys:**
- `schemaId` → `schemas.id` (on delete: no action)

---

### consent_document_version_translations

| Column | Type | Nullable | Default | Notes | Comments |
| --- | --- | --- | --- | --- | --- |
| `id` | uuid | NO | `defaultRandom()` | PK |  |
| `consentDocumentVersionId` | uuid | NO |  | FK |  |
| `locale` | text | NO |  |  |  |
| `content` | jsonb | NO | `{}` |  |  |
| `createdAt` | timestamptz | NO | `defaultNow()` |  |  |
| `updatedAt` | timestamptz | NO | `defaultNow()` | auto-updated |  |

**Primary Key:** `id`
**Foreign Keys:**
- `consentDocumentVersionId` → `consent_document_versions.id` (on delete: cascade)

**Indexes:**
- `consent_document_version_translations_consent_document_version_locale_unique` — unique on (`consentDocumentVersionId`, `locale`)

---

### consent_document_versions

| Column | Type | Nullable | Default | Notes | Comments |
| --- | --- | --- | --- | --- | --- |
| `id` | uuid | NO | `defaultRandom()` | PK |  |
| `consentDocumentId` | uuid | NO |  | FK |  |
| `schemaVersionId` | uuid | NO |  | FK |  |
| `version` | integer | NO |  |  |  |
| `status` | consent_document_version_status | NO |  | enum(draft,published,archived) |  |
| `archivedAt` | timestamptz | YES |  |  |  |
| `publishedAt` | timestamptz | YES |  |  |  |
| `createdAt` | timestamptz | NO | `defaultNow()` |  |  |
| `updatedAt` | timestamptz | NO | `defaultNow()` | auto-updated |  |

**Primary Key:** `id`
**Foreign Keys:**
- `consentDocumentId` → `consent_documents.id` (on delete: cascade)
- `schemaVersionId` → `schema_versions.id` (on delete: no action)

**Indexes:**
- `consent_document_versions_consent_document_version_unique` — unique on (`consentDocumentId`, `version`)

---

### consent_documents

| Column | Type | Nullable | Default | Notes | Comments |
| --- | --- | --- | --- | --- | --- |
| `id` | uuid | NO | `defaultRandom()` | PK |  |
| `consentDocumentTypeId` | uuid | NO |  | FK |  |
| `orgUnitId` | uuid | NO |  | FK |  |
| `publishedConsentDocumentVersionId` | uuid | YES |  | FK |  |
| `createdAt` | timestamptz | NO | `defaultNow()` |  |  |
| `updatedAt` | timestamptz | NO | `defaultNow()` | auto-updated |  |

**Primary Key:** `id`
**Foreign Keys:**
- `consentDocumentTypeId` → `consent_document_types.id` (on delete: no action)
- `orgUnitId` → `org_units.id` (on delete: no action)
- `publishedConsentDocumentVersionId` → `consent_document_versions.id` (on delete: set null)

---

### consent_statements

| Column | Type | Nullable | Default | Notes | Comments |
| --- | --- | --- | --- | --- | --- |
| `id` | uuid | NO |  | PK |  |
| `consentDocumentVersionId` | uuid | NO |  | FK |  |
| `userId` | uuid | NO |  | FK |  |
| `action` | consent_statement_action | NO |  | enum(approve,deny,revoke) |  |
| `createdAt` | timestamptz | NO | `defaultNow()` |  |  |

**Primary Key:** `id`
**Foreign Keys:**
- `consentDocumentVersionId` → `consent_document_versions.id` (on delete: cascade)
- `userId` → `users.id` (on delete: cascade)

---

### service_contributors

| Column | Type | Nullable | Default | Notes | Comments |
| --- | --- | --- | --- | --- | --- |
| `serviceId` | uuid | NO |  | PK, FK |  |
| `userId` | uuid | NO |  | PK, FK |  |
| `role` | service_contributor_role | NO |  | enum(owner) |  |
| `createdAt` | timestamptz | NO | `defaultNow()` |  |  |
| `updatedAt` | timestamptz | NO | `defaultNow()` | auto-updated |  |

**Primary Key:** (`serviceId`, `userId`) — composite
**Foreign Keys:**
- `serviceId` → `services.id` (on delete: cascade)
- `userId` → `users.id` (on delete: cascade)

---

### service_types

| Column | Type | Nullable | Default | Notes | Comments |
| --- | --- | --- | --- | --- | --- |
| `id` | uuid | NO | `defaultRandom()` | PK |  |
| `schemaId` | uuid | NO |  | FK |  |
| `name` | text | NO |  |  |  |
| `description` | text | YES |  |  |  |
| `createdAt` | timestamptz | NO | `defaultNow()` |  |  |
| `updatedAt` | timestamptz | NO | `defaultNow()` | auto-updated |  |

**Primary Key:** `id`
**Foreign Keys:**
- `schemaId` → `schemas.id` (on delete: no action)

---

### service_version_translations

| Column | Type | Nullable | Default | Notes | Comments |
| --- | --- | --- | --- | --- | --- |
| `id` | uuid | NO | `defaultRandom()` | PK |  |
| `serviceVersionId` | uuid | NO |  | FK |  |
| `locale` | text | NO |  |  |  |
| `content` | jsonb | NO | `{}` |  |  |
| `createdAt` | timestamptz | NO | `defaultNow()` |  |  |
| `updatedAt` | timestamptz | NO | `defaultNow()` | auto-updated |  |

**Primary Key:** `id`
**Foreign Keys:**
- `serviceVersionId` → `service_versions.id` (on delete: cascade)

**Indexes:**
- `service_version_translation_service_version_locale_unique` — unique on (`serviceVersionId`, `locale`)

---

### service_versions

| Column | Type | Nullable | Default | Notes | Comments |
| --- | --- | --- | --- | --- | --- |
| `id` | uuid | NO | `defaultRandom()` | PK |  |
| `schemaVersionId` | uuid | NO |  | FK |  |
| `serviceId` | uuid | NO |  | FK |  |
| `version` | integer | NO |  |  |  |
| `status` | service_version_status | NO |  | enum(draft,published,archived) |  |
| `archivedAt` | timestamptz | YES |  |  |  |
| `publishedAt` | timestamptz | YES |  |  |  |
| `createdAt` | timestamptz | NO | `defaultNow()` |  |  |
| `updatedAt` | timestamptz | NO | `defaultNow()` | auto-updated |  |

**Primary Key:** `id`
**Foreign Keys:**
- `schemaVersionId` → `schema_versions.id` (on delete: no action)
- `serviceId` → `services.id` (on delete: cascade)

**Indexes:**
- `service_versions_service_version_unique` — unique on (`serviceId`, `version`)

---

### services

| Column | Type | Nullable | Default | Notes | Comments |
| --- | --- | --- | --- | --- | --- |
| `id` | uuid | NO | `defaultRandom()` | PK |  |
| `orgUnitId` | uuid | NO |  | FK |  |
| `publishedServiceVersionId` | uuid | YES |  | FK |  |
| `serviceTypeId` | uuid | NO |  | FK, unique |  |
| `createdAt` | timestamptz | NO | `defaultNow()` |  |  |
| `updatedAt` | timestamptz | NO | `defaultNow()` | auto-updated |  |

**Primary Key:** `id`
**Foreign Keys:**
- `orgUnitId` → `org_units.id` (on delete: no action)
- `publishedServiceVersionId` → `service_versions.id` (on delete: set null)
- `serviceTypeId` → `service_types.id` (on delete: no action)

---

## Relationships

### Entity Relationship Summary

| Table | Has Many | Belongs To |
| --- | --- | --- |
| `user_roles` | — | users |
| `users` | user_roles, identities, org_unit_members, consent_document_contributors, consent_statements, service_contributors | — |
| `identities` | — | users |
| `org_unit_members` | — | org_units, users |
| `org_unit_relations` | — | org_units |
| `org_units` | org_unit_members, org_unit_relations, consent_documents, services | — |
| `schema_versions` | schemas, consent_document_versions, service_versions | schemas |
| `schemas` | schema_versions, consent_document_types, service_types | schema_versions |
| `consent_document_contributors` | — | consent_documents, users |
| `consent_document_types` | consent_documents | schemas |
| `consent_document_version_translations` | — | consent_document_versions |
| `consent_document_versions` | consent_document_version_translations, consent_documents, consent_statements | consent_documents, schema_versions |
| `consent_documents` | consent_document_contributors, consent_document_versions | consent_document_types, org_units, consent_document_versions |
| `consent_statements` | — | consent_document_versions, users |
| `service_contributors` | — | services, users |
| `service_types` | services | schemas |
| `service_version_translations` | — | service_versions |
| `service_versions` | service_version_translations, services | schema_versions, services |
| `services` | service_contributors, service_versions | org_units, service_versions, service_types |

---

*Generated on 2026-03-19*

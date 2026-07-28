# Database Model — Main DB & Notifications DB

Entity-relationship diagrams for the two **physically separate** PostgreSQL databases,
derived from the Drizzle schemas (`packages/database/src/schema`,
`packages/notification-database/src/schema`).

Key conventions carried from the schema:

- All PKs are `uuid`; every mutable table has `created_at` / `updated_at` (append-only
  audit tables omit `updated_at`).
- Several relationships are enforced by **composite foreign keys** (e.g.
  `(type_id, kind)`, `(id, workspace_id)`) — the crow's-foot lines below show the
  logical parent→child link; the compositeness is noted where it matters.
- `status` on `*_versions` (documents/types) is a **GENERATED** column derived from
  timestamps; `submission_versions.status`, `deliveries.status`, `notification_outbox.status`
  are **writable** state machines.
- The two databases **never share an FK**. They are linked only **by value**:
  `notification_outbox.user_id` / `idempotency_key` → `recipients.user_id` /
  `notifications.idempotency_key`.

---

## 1. Main database (`@repo/database`)

Staff-authored catalogue (services / forms / agreements), citizens' submissions, reviews,
and the transactional notification outbox.

```mermaid
erDiagram
    users ||--o{ identities : "has identity"
    users ||--o{ workspaces : "owns"
    users ||--o{ workspace_members : "member of"
    workspaces ||--o{ workspace_members : "has member"

    workspaces |o--o{ document_types : "scopes (null=global)"
    document_types ||--o{ document_type_versions : "versioned by"

    workspaces |o--o{ documents : "scopes (null=global)"
    document_types ||--o{ documents : "instance of (type_id,kind)"
    documents ||--o{ document_members : "shared with"
    workspace_members ||--o{ document_members : "grants"
    documents ||--o{ document_versions : "versioned by"
    document_type_versions ||--o{ document_versions : "pins type version"
    document_versions ||--o{ document_version_contributors : "edited by"
    users ||--o{ document_version_contributors : "contributor"

    document_versions ||--o{ document_references : "owner (service)"
    document_versions ||--o{ document_references : "target (form/svc/agreement)"

    documents ||--o{ submissions : "submitted against"
    document_versions ||--o{ submissions : "of version"
    users |o--o{ submissions : "submitted by (null=anon)"
    submissions ||--o{ submission_versions : "revised by"
    submission_versions ||--o{ reviews : "reviewed in"
    submissions ||--o{ reviews : "scopes review"
    users ||--o{ reviews : "reviewer"

    document_versions ||--o{ service_agreement_consents : "consented version"
    users ||--o{ service_agreement_consents : "consenter"
    workspaces ||--o{ workspace_default_agreements : "defaults for"
    documents ||--o{ workspace_default_agreements : "agreement doc"

    users ||--o{ notification_outbox : "notify"

    users {
        uuid id PK
        text display_name
        citext email "nullable, non-unique"
        user_role_arr roles "admin|staff|citizen"
        timestamptz deleted_at "null = active (soft delete)"
    }
    identities {
        uuid id PK
        uuid user_id FK
        text issuer "UK(issuer,sub)"
        text sub "UK(issuer,sub)"
        timestamptz last_login_at
    }
    workspaces {
        uuid id PK
        text slug UK "default nanoid(8)"
        text name
        uuid owner_user_id FK "RESTRICT"
        jsonb settings
    }
    workspace_members {
        uuid id PK
        uuid user_id FK "UK(user_id,workspace_id)"
        uuid workspace_id FK
        wm_role role "admin|member"
        wm_status status "active|suspended"
    }
    document_types {
        uuid id PK "UK(id,kind)"
        uuid workspace_id FK "nullable = global"
        text name
        text kind
    }
    document_type_versions {
        uuid id PK "UK(id,type_id)"
        uuid type_id FK
        int version "UK(type_id,version)"
        jsonb definition
        dtv_status status "GENERATED draft|published|archived"
        timestamptz published_at
        timestamptz archived_at
    }
    documents {
        uuid id PK "UK(id,type_id),(id,workspace_id),(id,kind)"
        uuid type_id "FK (type_id,kind)->document_types"
        uuid workspace_id FK "nullable = global"
        text kind "denormalized, pinned"
        text title
        text description
    }
    document_members {
        uuid id PK
        uuid document_id "FK (document_id,workspace_id)"
        uuid user_id "FK (user_id,workspace_id)"
        uuid workspace_id
        dm_role role "admin|editor|viewer"
    }
    document_versions {
        uuid id PK "UK(id,document_id)"
        uuid document_id "FK (document_id,type_id)"
        uuid type_id
        uuid type_version_id "FK (type_version_id,type_id)"
        int version "UK(document_id,version)"
        jsonb data
        jsonb schema "form structure, null for services"
        dv_status status "GENERATED draft|published|archived"
        timestamptz published_at
        timestamptz archived_at
    }
    document_version_contributors {
        uuid id PK
        uuid document_version_id FK
        uuid user_id FK "RESTRICT"
        timestamptz first_update_at
        timestamptz last_update_at
    }
    document_references {
        uuid id PK "UK(owner_version_id,target_document_id)"
        uuid owner_version_id "FK ->document_versions"
        uuid owner_document_id
        text owner_kind "CHECK = 'service'"
        uuid target_version_id "nullable for agreement"
        uuid target_document_id
        text target_kind
        uuid workspace_id
        uuid target_workspace_id "null = global agreement"
        dr_relation relation "related_service|application_form|service_agreement|external_application"
        text label
        int position
    }
    submissions {
        uuid id PK "UK(id,workspace_id)"
        uuid document_id "FK (document_id,workspace_id)"
        uuid document_version_id "FK (document_version_id,document_id)"
        uuid user_id FK "nullable = anonymous"
        uuid workspace_id
    }
    submission_versions {
        uuid id PK "UK(id,submission_id)"
        uuid submission_id "FK (submission_id,workspace_id)"
        uuid workspace_id
        int version "UK(submission_id,version)"
        jsonb data
        sv_status status "WRITABLE draft|pending|in_review|approved|rejected|needs_changes|withdrawn"
        timestamptz submitted_at
        timestamptz withdrawn_at
    }
    reviews {
        uuid id PK "append-only, no updated_at"
        uuid submission_version_id "FK (submission_version_id,submission_id)"
        uuid submission_id "FK (submission_id,workspace_id)"
        uuid workspace_id
        uuid reviewer_id FK "RESTRICT"
        rv_decision decision "approved|rejected|flagged|needs_changes|escalated|no_action"
        text reason
        jsonb metadata
    }
    service_agreement_consents {
        uuid id PK "append-only, no updated_at"
        uuid user_id FK "RESTRICT"
        uuid agreement_document_id
        uuid agreement_version_id "FK (agreement_version_id,agreement_document_id)"
        sac_decision decision "approve|reject"
    }
    workspace_default_agreements {
        uuid id PK "UK(workspace_id,agreement_document_id)"
        uuid workspace_id FK
        uuid agreement_document_id "FK (agreement_document_id,agreement_kind)"
        text agreement_kind "CHECK = 'service-agreement'"
        uuid agreement_workspace_id "null = global"
    }
    notification_outbox {
        uuid id PK
        text idempotency_key UK "-> notifications.idempotency_key (by value)"
        uuid user_id FK "-> recipients.user_id (by value, cross-db)"
        text type
        text title
        text body
        jsonb payload
        text email
        outbox_status status "WRITABLE pending|delivered|failed"
        int attempts
        timestamptz next_attempt_at
        timestamptz delivered_at
    }
```

---

## 2. Notifications database (`@repo/notification-database`)

Physically separate Postgres. `recipients.user_id` holds the platform `users.id` **value**
as an opaque uuid — no FK, no cross-database join.

```mermaid
erDiagram
    recipients ||--o{ channel_preferences : "opt-in per channel"
    recipients ||--o{ notifications : "addressed to"
    recipients ||--o{ deliveries : "delivered to"
    notifications ||--o{ deliveries : "fanned out to (id,recipient_id)"

    recipients {
        uuid id PK
        uuid user_id UK "opaque platform users.id (no FK)"
        citext email
    }
    channel_preferences {
        uuid id PK
        uuid recipient_id FK "UK(recipient_id,channel)"
        notification_channel channel "in_app|email"
        boolean enabled "default false; missing row = never configured"
    }
    notifications {
        uuid id PK "UK(id,recipient_id)"
        text idempotency_key UK "producer-supplied dedupe"
        uuid recipient_id FK
        text type "e.g. application.decision"
        text title
        text body
        jsonb payload
    }
    deliveries {
        uuid id PK "UK(notification_id,channel)"
        uuid notification_id "FK (notification_id,recipient_id)->notifications"
        uuid recipient_id FK "denormalized, pinned"
        notification_channel channel "in_app|email"
        delivery_status status "WRITABLE pending|sent|failed"
        int attempts
        timestamptz next_attempt_at
        timestamptz sent_at
        timestamptz read_at "in-app mark-read; null for email"
    }
```

---

## Cross-database link (by value, never an FK)

```mermaid
flowchart LR
    subgraph main["Main DB"]
        outbox["notification_outbox<br/>(user_id, idempotency_key)"]
    end
    subgraph notif["Notifications DB"]
        recip["recipients.user_id"]
        notes["notifications.idempotency_key"]
    end
    outbox -->|"relay drains outbox → ingestion API"| notes
    outbox -.->|"user_id value = recipient's user_id"| recip
```

Each BFF's relay drains `notification_outbox` (FOR UPDATE SKIP LOCKED) and POSTs to the
notification-service ingestion API. Integrity across the two databases is maintained
**by value** — the shared `user_id` and the `idempotency_key` (unique on both sides, so a
relay crash between POST and mark-delivered replays safely).

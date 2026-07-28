# C4 — System Context

The Single Digital Gateway (SDG) is delivered as **two separate applications** — a
**Citizen Portal** for citizens to discover and apply for public services, and a
**Staff Platform** for staff/admins to author those services, review submissions, and
manage workspaces. Each audience uses only its own application. Authentication is
delegated to **Keycloak** (separate OIDC realms per audience), and a shared
**Notification System** notifies users out-of-band.

```mermaid
C4Context
    title System Context — Single Digital Gateway

    Person(citizen, "Citizen", "Discovers public services and submits applications")
    Person(staff, "Staff / Admin", "Authors services & forms, reviews submissions, manages workspaces")

    System_Boundary(sdg, "Single Digital Gateway") {
        System(citizenPortal, "Citizen Portal", "Public-facing app: browse the service catalogue and submit applications (citizens only)")
        System(staffPlatform, "Staff Platform", "Internal app: author services & forms, review submissions, manage workspaces (staff/admins only)")
        System(notifications, "Notification System", "Shared service: in-app feed + transactional email delivery")
    }

    System_Ext(keycloak, "Keycloak", "OIDC identity provider. Separate realms per audience: 'sdg' (staff) and 'citizens'")
    System_Ext(email, "Email Provider", "Delivers transactional notification emails")

    Rel(citizen, citizenPortal, "Browses catalogue, applies for services", "HTTPS")
    Rel(staff, staffPlatform, "Authors services/forms, reviews applications", "HTTPS")

    Rel(citizenPortal, keycloak, "Authenticates citizens (realm 'citizens')", "OIDC / HTTPS")
    Rel(staffPlatform, keycloak, "Authenticates staff (realm 'sdg')", "OIDC / HTTPS")

    Rel(citizenPortal, notifications, "Enqueues notifications", "m2m / HTTPS")
    Rel(staffPlatform, notifications, "Enqueues notifications", "m2m / HTTPS")

    Rel(notifications, email, "Sends notification emails", "SMTP/API")
    Rel(notifications, citizen, "Notifies (in-app feed + email)", "HTTPS / email")
    Rel(notifications, staff, "Notifies (in-app feed + email)", "HTTPS / email")

    UpdateLayoutConfig($c4ShapeInRow="2", $c4BoundaryInRow="1")
```

## Actors, systems & external dependencies

| Element                 | Description                                                                                                                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Citizen**             | End user browsing the published service catalogue and submitting applications. Uses **only** the Citizen Portal; authenticates against the Keycloak `citizens` realm.                         |
| **Staff / Admin**       | Internal user authoring services, forms and service agreements, reviewing submissions, and administering workspaces. Uses **only** the Staff Platform; authenticates against the `sdg` realm. |
| **Citizen Portal**      | The public-facing application (SPA + BFF). No workspace concept is exposed to the caller.                                                                                                     |
| **Staff Platform**      | The internal application (SPA + BFF) for authoring and review, including the admin shell.                                                                                                     |
| **Notification System** | Shared server-to-server service both applications enqueue into; owns the in-app feed and drains the email outbox.                                                                             |
| **Keycloak**            | External OIDC identity provider. Realm-per-audience means a citizen token can never be used against the Staff Platform.                                                                       |
| **Email Provider**      | External transactional email channel drained by the Notification System.                                                                                                                      |

> Each audience interacts with a **distinct application**; they are separated all the
> way down — separate SPAs, separate BFFs, and separate Keycloak realms. The
> [container diagram](./02-container.md) shows the SPA + BFF pair behind each.

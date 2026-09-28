## Citizen Portal API Audit Testing

### 1. Duplicated Test Cases Across Test Files

These test cases share identical descriptions or validation logic across different test suites and files:

| Test Case Name                                                 |      Occurrences      | Files                                                                                                                                | Suite / Context                                                                                     |
| :------------------------------------------------------------- | :-------------------: | :----------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------- |
| **`"should verify metadata declaration directly"`**            |      **4 files**      | - `applications.module.test.ts`<br>- `catalog.module.test.ts`<br>- `notifications.module.test.ts`<br>- `outbox-relay.module.test.ts` | Direct metadata verification on NestJS module declarations                                          |
| **`"should throw NotFoundException if service is not found"`** |      **3 files**      | - `applications.service.test.ts`<br>- `consent.service.test.ts`<br>- `catalog.service.test.ts`                                       | Service lookup exception handling when record does not exist                                        |
| **`"should fail validation if required fields are missing"`**  | **1 file** (2 suites) | - `service-agreements.dtos.test.ts`                                                                                                  | Zod schema validation checks on `serviceAgreementListItemSchema` and `serviceAgreementDetailSchema` |

---

### 2. Duplicated Helper Functions Across Files

These functions are implemented independently in multiple files and are prime candidates for centralizing into shared test utilities:

| Function Name       | Occurrences | Files                                                                                                                                                                                                        | Purpose / Implementation                                                                                                            |
| :------------------ | :---------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| **`seedUser`**      | **6 files** | - `applications.e2e.test.ts`<br>- `catalog.e2e.test.ts`<br>- `consent.e2e.test.ts`<br>- `guard.e2e.test.ts`<br>- `my-service-agreements.e2e.test.ts`<br>- `notifications.e2e.test.ts`                        | E2E helper seeding a test citizen user into the database via direct SQL/Drizzle insertion                                           |
| **`http`**          | **7 files** | - `applications.e2e.test.ts`<br>- `catalog.e2e.test.ts`<br>- `consent.e2e.test.ts`<br>- `guard.e2e.test.ts`<br>- `my-service-agreements.e2e.test.ts`<br>- `notifications.e2e.test.ts`<br>- `geo.e2e.test.ts` | E2E supertest wrapper returning `request(app.getHttpServer())`                                                                      |
| **`createDbMock`**  | **5 files** | - `oidc-user-sync.test.ts`<br>- `applications.service.test.ts`<br>- `consent.service.test.ts`<br>- `catalog.service.test.ts`<br>- `service-agreements.service.test.ts`                                       | Factory returning a mock Drizzle database client with query builder methods (`select`, `insert`, `update`, `delete`, `transaction`) |
| **`createBuilder`** | **4 files** | - `applications.service.test.ts`<br>- `consent.service.test.ts`<br>- `catalog.service.test.ts`<br>- `service-agreements.service.test.ts`                                                                     | Chainable query builder mock object supporting `from`, `where`, `innerJoin`, `limit`, `offset`, `orderBy`, and `execute`            |
| **`mockResponse`**  | **4 files** | - `applications.service.test.ts`<br>- `consent.service.test.ts`<br>- `catalog.service.test.ts`<br>- `service-agreements.service.test.ts`                                                                     | Mock response helper configuring mock database query result rows                                                                    |
| **`str`**           | **2 files** | - `oidc-user-sync.service.ts`<br>- `service-agreements.service.ts`                                                                                                                                           | Utility checking if value is non-empty string and returning string or fallback/undefined                                            |

---

### 3. Duplicated Mock Fixtures & Constants

These mock data objects, constants, and spies are redeclared with identical structures across multiple test files:

| Identifier                          | Occurrences | Files                                                                                                                                                                                                           | Description                                                                                 |
| :---------------------------------- | :---------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------ |
| **`mockUser`**                      | **3 files** | - `my-applications-v1.controller.test.ts`<br>- `my-notifications-v1.controller.test.ts`<br>- `my-service-agreements-v1.controller.test.ts`                                                                      | Authenticated user payload object with `id`, `roles: ['citizen']`, and standard claims      |
| **`mockConfigService`**             | **6 files** | - `app.module.test.ts`<br>- `applications.module.test.ts`<br>- `notifications.module.test.ts`<br>- `notifications-proxy.service.test.ts`<br>- `outbox-relay.module.test.ts`<br>- `outbox-relay.service.test.ts` | Mock `ConfigService` object providing environment variable getters                          |
| **`header`**                        | **6 files** | - `applications.e2e.test.ts`<br>- `catalog.e2e.test.ts`<br>- `consent.e2e.test.ts`<br>- `guard.e2e.test.ts`<br>- `my-service-agreements.e2e.test.ts`<br>- `notifications.e2e.test.ts`                           | Base64-encoded mock auth header (`x-user`) used for authenticating E2E supertest requests   |
| **`fetchSpy`**                      | **4 files** | - `geocoder.test.ts`<br>- `notifications-proxy.service.test.ts`<br>- `m2m-token.client.test.ts`<br>- `outbox-relay.service.test.ts`                                                                             | Global fetch spy created via `vi.spyOn(globalThis, 'fetch')`                                |
| **`UUID`**                          | **3 files** | - `consent.e2e.test.ts`<br>- `notifications.e2e.test.ts`<br>- `consent-dtos.test.ts`                                                                                                                            | Regular expression pattern matching standard UUID v4 strings                                |
| **`mockReq` / `mockRes`**           | **2 files** | - `my-notifications-v1.controller.test.ts`<br>- `notifications-proxy.service.test.ts`                                                                                                                           | Mock Express/Fastify request and response objects for SSE streaming and proxy controllers   |
| **`getTokenSpy` / `invalidateSpy`** | **2 files** | - `notifications-proxy.service.test.ts`<br>- `outbox-relay.service.test.ts`                                                                                                                                     | Spies on `M2mTokenClient.prototype.getToken` and `M2mTokenClient.prototype.invalidateToken` |
| **`responseMock`**                  | **3 files** | - `notifications-proxy.service.test.ts`<br>- `m2m-token.client.test.ts`<br>- `outbox-relay.service.test.ts`                                                                                                     | Mock fetch Response objects with custom status, ok, and json/text mocks                     |
| **`mockRow` / `mockRows`**          | **3 files** | - `service-agreements.service.test.ts`<br>- `catalog.service.test.ts`<br>- `enqueue.test.ts`                                                                                                                    | Mock table row fixtures for service agreements, catalog services, and outbox entries        |

---

### 4. Repeated Test Variable & Implementation Patterns

These variables and mocking patterns are defined inside test bodies (`it` / `describe` blocks) across multiple test files:

| Variable Name                                      | Occurrences | Files                                                                                                                                                                            | Usage Pattern                                                                            |
| :------------------------------------------------- | :---------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------- |
| **`dbMock` / `mocks`**                             | **5 files** | - `oidc-user-sync.test.ts`<br>- `applications.service.test.ts`<br>- `consent.service.test.ts`<br>- `catalog.service.test.ts`<br>- `service-agreements.service.test.ts`           | Database mock instance and method spies holder reset in `beforeEach`                     |
| **`activeTable` / `builder`**                      | **4 files** | - `applications.service.test.ts`<br>- `consent.service.test.ts`<br>- `catalog.service.test.ts`<br>- `service-agreements.service.test.ts`                                         | State variables tracking the current table and mock query builder chain during execution |
| **`providers` / `controllers`**                    | **5 files** | - `app.module.test.ts`<br>- `applications.module.test.ts`<br>- `catalog.module.test.ts`<br>- `notifications.module.test.ts`<br>- `outbox-relay.module.test.ts`                   | Metadata arrays extracted from module definitions for unit testing NestJS DI setup       |
| **`applicationsServiceMock`**                      | **2 files** | - `application-forms-v1.controller.test.ts`<br>- `my-applications-v1.controller.test.ts`                                                                                         | Controller unit test mock for `ApplicationsService`                                      |
| **`expectedResult` / `mockResult` / `mockDetail`** | **4 files** | - `application-forms-v1.controller.test.ts`<br>- `consent-v1.controller.test.ts`<br>- `my-applications-v1.controller.test.ts`<br>- `my-service-agreements-v1.controller.test.ts` | Expected controller DTO return value fixtures                                            |

---

### 5. Shared Functions & Variables Imported Across Multiple Files

These existing application modules, utilities, and database schemas are exported and imported across multiple files:

- **`AppModule`** (10 files: `applications.e2e.test.ts`, `catalog.e2e.test.ts`, `consent.e2e.test.ts`, `guard.e2e.test.ts`, `health.e2e.test.ts`, `my-service-agreements.e2e.test.ts`, `notifications.e2e.test.ts`, `swagger.e2e.test.ts`, `database-wiring.e2e.test.ts`, `app.module.test.ts`) - imported from `app.module.ts`
- **`ApplicationsService`** (3 files: `application-forms-v1.controller.ts`, `my-applications-v1.controller.ts`, `applications.service.test.ts`) - imported from `applications.service.ts`
- **`ConsentService`** (2 files: `consent-v1.controller.ts`, `consent.service.test.ts`) - imported from `consent.service.ts`
- **`CatalogService`** (2 files: `catalog-v1.controller.ts`, `catalog.service.test.ts`) - imported from `catalog.service.ts`
- **`NotificationsProxyService`** (2 files: `my-notifications-v1.controller.ts`, `notifications-proxy.service.test.ts`) - imported from `notifications-proxy.service.ts`
- **`ServiceAgreementsService`** (2 files: `my-service-agreements-v1.controller.ts`, `service-agreements.service.test.ts`) - imported from `service-agreements.service.ts`
- **`M2mTokenClient`** (2 files: `m2m-token.client.test.ts`, `outbox-relay.service.ts`) - imported from `m2m-token.client.ts`
- **`OutboxRelayService`** (2 files: `outbox-relay.module.ts`, `outbox-relay.service.test.ts`) - imported from `outbox-relay.service.ts`
- **`backoffMs` & `DEFAULT_BACKOFF_BASE_MS`** (2 files: `outbox-relay.service.ts`, `backoff.test.ts`) - imported from `backoff.ts`
- **`enqueueNotification`** (2 files: `applications.service.ts`, `enqueue.test.ts`) - imported from `enqueue.ts`
- **`buildNotificationContent`** (2 files: `applications.service.ts`, `notification-content.test.ts`) - imported from `notification-content.ts`
- **`formatApplicationDetail` & `formatApplicationListItem`** (2 files: `applications.service.ts`, `format.test.ts`) - imported from `format.ts`
- **`formatAddress` & `validatePostalCodeMatchesProvince`** (3 files: `applications.service.ts`, `address-postal.test.ts`, `validate.test.ts`) - imported from `format.ts` / `validate.ts`
- **`Env` / `envSchema`** (4 files: `applications.service.ts`, `geocoder.service.ts`, `notifications-proxy.service.ts`, `env.test.ts`) - imported from `env.schema.ts`
- **`DATABASE_CLIENT`** (4 files: `database-wiring.e2e.test.ts`, `applications.module.test.ts`, `catalog.module.test.ts`, `outbox-relay.module.test.ts`) - imported from `@repo/nestjs/database`
- **`serviceAgreementConsents` / `notificationOutbox` / `documents` / `documentVersions`** (5+ files each) - imported from `@repo/database`

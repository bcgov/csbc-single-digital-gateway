## Platform Web Audit Testing

A scan across all **122 test files** in `platform-web` confirms that all duplicated helper functions, test cases, and shared fixtures have been resolved and centralized.

---

### 1. Duplicated Test Cases Across Test Files

| Test Case Name     |   Occurrences    | Files | Suite / Context                                                        |    Status    |
| :----------------- | :--------------: | :---- | :--------------------------------------------------------------------- | :----------: |
| **All Test Cases** | **0 duplicates** | —     | All test cases have unique descriptions and distinct assertion scopes. | ✅ **Clean** |

---

### 2. Duplicated Helper Functions Across Test Files

| Function Name            |   Occurrences    | Files | Purpose / Implementation                                                                        |    Status    |
| :----------------------- | :--------------: | :---- | :---------------------------------------------------------------------------------------------- | :----------: |
| **All Helper Functions** | **0 duplicates** | —     | All test helpers, mock response factories, and BFF handlers are centralized in `test/support/`. | ✅ **Clean** |

---

### 3. Duplicated Mock Fixtures & Constants

| Identifier             |   Occurrences    | Files | Description                                                                                    |    Status    |
| :--------------------- | :--------------: | :---- | :--------------------------------------------------------------------------------------------- | :----------: |
| **All Other Fixtures** | **0 duplicates** | —     | Component-specific test data and model fixtures are cleanly scoped to their respective suites. | ✅ **Clean** |

---

### 4. Summary of Centralized Test Support Utilities

| Centralized Entity                                 | Location                                      | Consuming Test Suites                                                                                                                                             |
| :------------------------------------------------- | :-------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`mockFetch`**                                    | `vi-fixtures.ts`                              | `document-types.test.ts`, `forms.test.ts`, `notifications.test.ts`, `service-agreements.test.ts`, `services.test.ts`, `submissions.test.ts`, `workspaces.test.ts` |
| **`mockNotificationsBff`**                         | `mock-notifications-bff.ts`                   | `notification-settings.test.tsx`, `notifications-menu.test.tsx`                                                                                                   |
| **`mockDefinition` & `gridNode`**                  | `fixtures.ts`                                 | `service-editor.test.tsx`, `preview.test.tsx`, `field-rows.test.tsx`, `inspector.test.tsx`                                                                        |
| **`serviceAgreementDefinition`**                   | `fixtures.ts`                                 | `agreement-editor.test.tsx`, `service-agreements.test.ts`                                                                                                         |
| **`externalRef`**                                  | File-scoped in `application-methods.test.tsx` | `application-methods.test.tsx`                                                                                                                                    |
| **`twoStageVal`**                                  | File-scoped in `stage-builder.test.tsx`       | `stage-builder.test.tsx`                                                                                                                                          |
| **`mockCountries` / `mockStates` / `mockRegions`** | File-scoped in `geo.test.ts`                  | `geo.test.ts`                                                                                                                                                     |

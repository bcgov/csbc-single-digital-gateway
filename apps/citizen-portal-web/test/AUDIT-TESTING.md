## Citizen Portal Web Test Suite Audit (Clean Scan)

A full scan across all 50 test files in the `citizen-portal-web` directory was performed. Repeated test variable and implementation patterns (such as standard route helper factories) and the specified exempt identifiers (`http`, `mockResponse`, `str`, `getTokenSpy`, `mockRow`, `mockRows`, `mockDbClient`, `mockList`, `mockUpdatedVersion`, `mockResult`, `providers`, `configMock`, `user`, `actual`, `result`, `module`, `url`, `router`, `logoutBtn`, `patchPromise`, `continueBtn`, `submitBtn`, `assign`, `assignMock`) were ignored.

---

### 1. Duplicated Test Cases Across Test Files

| Test Case Name | Occurrences | Files |  Status   |
| :------------- | :---------: | :---- | :-------: |
| —              |    **0**    | None  | **Clean** |

> **Result:** No duplicated test cases remain across test files. The previously matching test names across module files have been given distinct identifiers.

---

### 2. Duplicated Helper Functions Across Test Files

| Helper Function | Occurrences | Files | Scope / Purpose |  Status   |
| :-------------- | :---------: | :---- | :-------------- | :-------: |
| —               |    **0**    | None  | N/A             | **Clean** |

> **Result:** All non-exempt helper functions (such as `createMockAssign`, `createMockBff`, `createMockSpy`, `renderApp`, `renderPage`, `renderGate`, `renderComponent`, `renderApp`, `renderApply`, `setOpen`) have been centralized into shared test utility modules.

### 3. Duplicated Mock Fixtures & Top-Level Constants

| Identifier | Occurrences | Files | Scope / Purpose |  Status   |
| :--------- | :---------: | :---- | :-------------- | :-------: |
| —          |    **0**    | None  | N/A             | **Clean** |

> **Result:** All non-exempt top-level fixtures, constants, and spies (such as `authedUser`, `adminUser`, `applicationDetail`, `applicationsList`, `form`, `draft`, `services`, `serviceDetail`, `FEED`) have been centralized into shared fixture files. .All test-file constants (e.g. `DEV_PAGES`, `required`, `optional`, `approvedRequired`, `mockApplication`) are uniquely scoped.

---

### Audit Summary

The `citizen-portal-web` test suite is **completely clean** — no non-exempt duplicate test cases, helper functions, or fixtures remain.

import adminApiTest from "./tests/admin-api-test.ts";

export const options = {
  vus: 1,
  duration: "5s",
  thresholds: {
    http_req_duration: ["p(95)<300"], // 95% of requests should be below 300ms
    http_req_failed: ["rate<0.95"], // Less than 95% of requests should fail
    "group_duration{group:::Admin API - Services}": ["avg < 300"],
    "group_duration{group:::Admin API - Organization Units}": ["avg < 300"],
    "group_duration{group:::Admin API - Service Types}": ["avg < 300"],
    "group_duration{group:::Admin API - Consent Documents}": ["avg < 300"],
    "group_duration{group:::Admin API - Consent Document Types}": ["avg < 300"],
  },
};

/**
 * This is the main entry point for the admin API smoke tests. The purpose of these
 * smoke tests is to simulate real-world usage scenarios and measure the performance
 * of the application under smoke.
 */
export default function adminApiSmokeTest() {
  const testServices = true;
  const testOrgUnits = true;
  const testServiceTypes = true;
  const testConsentDocuments = true;
  const testConsentDocumentTypes = true;

  adminApiTest(
    testServices,
    testOrgUnits,
    testServiceTypes,
    testConsentDocuments,
    testConsentDocumentTypes,
  );
}

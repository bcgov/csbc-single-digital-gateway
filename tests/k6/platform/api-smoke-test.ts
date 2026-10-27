// @ts-ignore: k6 summary lib is loaded at runtime from a URL; suppress TS module resolution error
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import platformApiTest from './tests/platform-api-test.ts';

export const options = {
  vus: 1,
  duration: '5s',
  thresholds: {
    http_req_duration: ['p(95)<300'], // 95% of requests should be below 300ms
    http_req_failed: ['rate<0.95'], // Less than 95% of requests should fail
    'group_duration{group:::Platform API - Services}': ['avg < 300'],
    'group_duration{group:::Platform API - Organization Units}': ['avg < 300'],
    'group_duration{group:::Platform API - Service Types}': ['avg < 300'],
    'group_duration{group:::Platform API - Consent Documents}': ['avg < 300'],
    'group_duration{group:::Platform API - Consent Document Types}': ['avg < 300'],
  },
};

/**
 * This is the main entry point for the platform API smoke tests. The purpose of these
 * smoke tests is to simulate real-world usage scenarios and measure the performance
 * of the application under smoke.
 */
export default function platformApiSmokeTest() {
  const testOptions = {
    testAdminAuth: false,
    testAdminDocumentTypes: false,
    testStaffDefaultAgreements: false,
    testStaffDocumentTypes: false,
    testStaffGeo: false,
    testStaffMyNotifications: false,
    testStaffServiceAgreements: false,
    testStaffServices: false,
    testStaffSubmissions: false,
    testStaffWorkspaces: false,
  };

  platformApiTest(testOptions);
}

export function handleSummary(data: any) {
  return {
    'reports/admin-api-smoke-test.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

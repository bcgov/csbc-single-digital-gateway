// @ts-ignore: k6 summary lib is loaded at runtime from a URL; suppress TS module resolution error
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import platformApiTest from './tests/platform-api-test.ts';

export const options = {
  stages: [
    {
      duration: '20s',
      target: 30,
    },
    {
      duration: '30s',
      target: 30,
    },
    {
      duration: '20s',
      target: 0,
    },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests should be below 1000ms
    http_req_failed: ['rate<0.95'], // Less than 95% of requests should fail
    'group_duration{group:::Platform API - Services}': ['avg < 1000'],
    'group_duration{group:::Platform API - Organization Units}': ['avg < 1000'],
    'group_duration{group:::Platform API - Service Types}': ['avg < 1000'],
    'group_duration{group:::Platform API - Consent Documents}': ['avg < 1000'],
    'group_duration{group:::Platform API - Consent Document Types}': ['avg < 1000'],
  },
};

/**
 * This is the main entry point for the platform API stress tests. The purpose of these
 * stress tests is to simulate real-world usage scenarios and measure the performance
 * of the application under stress.
 */
export default function platformApiStressTest() {
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
    'utils/reports/platform-api-stress-test.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

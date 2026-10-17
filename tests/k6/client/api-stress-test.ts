// @ts-ignore: k6 summary lib is loaded at runtime from a URL; suppress TS module resolution error
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import clientApiTest from './tests/client-api-test.ts';

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
    http_req_failed: ['rate<0.85'], // Less than 85% of requests should fail
    'group_duration{group:::Client API - Me Applications}': ['avg < 2000'],
    'group_duration{group:::Client API - Applications}': ['avg < 2000'],
    'group_duration{group:::Client API - Services}': ['avg < 2000'],
  },
};

/**
 * This is the main entry point for the client API stress tests. The purpose of these
 * stress tests is to simulate real-world usage scenarios and measure the performance
 * of the application under stress.
 */
export default function clientApiStressTest() {
  const testAuthHealth = false;
  const testMeApplications = false;
  const testGeo = false;
  const testServices = false;
  const testConsent = false;
  const testNotifications = false;

  clientApiTest(
    testAuthHealth,
    testServices,
    testGeo,
    testMeApplications,
    testConsent,
    testNotifications,
  );
}

export function handleSummary(data: any) {
  return {
    'utils/reports/client-api-stress-test.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

import { browser } from 'k6/browser';
import { platformCookieData } from '../../utils/cookies.ts';
import AdminWebPages from '../utils/admin-web-pages.ts';

export const options = {
  scenarios: {
    web_smoke_test: {
      executor: 'constant-vus',
      vus: 1,
      duration: '5s',
      options: {
        browser: { type: 'chromium' },
      },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<100'], // 95% of requests should be below 100ms
    http_req_failed: ['rate<0.05'], // Less than 5% of requests should fail
    browser_http_req_duration: ['p(95)<1000'], // 95% of requests should be below 1000ms
    browser_http_req_failed: ['rate<0.01'], // Less than 1% of requests should fail
  },
};

/**
 * This is the main entry point for the platform web tests.
 */
export default async function platformWebTest(testHomePage: boolean) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await context.addCookies(platformCookieData.cookies);

  try {
    if (testHomePage) {
      const adminHomePage = new AdminWebPages();
      await adminHomePage.adminHomePage(page);
    }
  } finally {
    await page.close();
    await context.close();
  }
}

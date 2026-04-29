import { browser, Cookie } from "k6/browser";
import { appPage, homePage } from "../utils/web-pages.ts";

export const options = {
  scenarios: {
    web_load_test: {
      executor: "ramping-vus",
      options: {
        browser: { type: "chromium" },
      },
      stages: [
        {
          duration: "10s",
          target: 10,
        },
        {
          duration: "30s",
          target: 10,
        },
        {
          duration: "10s",
          target: 0,
        },
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% of requests should be below 500ms
    http_req_failed: ["rate<0.01"], // Less than 1% of requests should fail
    browser_http_req_duration: ["p(95)<2500"], // 95% of requests should be below 2500ms
    browser_http_req_failed: ["rate<0.05"], // Less than 5% of requests should fail
  },
};

// Load cookies from JSON file
const cookieData: Cookie[] = JSON.parse(open("../cookies/auth-cookies.json"));

/**
 * This is the main entry point for the web load tests. The purpose of these load
 * tests is to simulate real-world usage scenarios and measure the performance
 * of the application under load.
 */
export default async function webLoadTest() {
  const context = await browser.newContext();
  const page = await context.newPage();
  await context.addCookies(cookieData);

  try {
    // Home page
    await homePage();

    // App page
    await appPage(page);
  } finally {
    await page.close();
    await context.close();
  }
}

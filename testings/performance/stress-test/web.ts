import { browser, Cookie } from "k6/browser";
import { appPage, homePage } from "../utils/web-pages.ts";

export const options = {
  scenarios: {
    web_stress_test: {
      executor: "ramping-vus",
      options: {
        browser: { type: "chromium" },
      },
      stages: [
        {
          duration: "20s",
          target: 30,
        },
        {
          duration: "30s",
          target: 30,
        },
        {
          duration: "20s",
          target: 0,
        },
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<2000"], // 95% of requests should be below 2000ms
    http_req_failed: ["rate<0.01"], // Less than 1% of requests should fail
    browser_http_req_duration: ["p(95)<7000"], // 95% of requests should be below 7000ms
    browser_http_req_failed: ["rate<0.05"], // Less than 5% of requests should fail
  },
};

// Load cookies from JSON file
const cookieData: Cookie[] = JSON.parse(open("../cookies/auth-cookies.json"));

/**
 * This is the main entry point for the web stress tests. The purpose of these stress
 * tests is to simulate high-load scenarios and measure the performance of the application
 * under stress.
 */
export default async function webStressTest() {
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

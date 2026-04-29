import { browser, Cookie } from "k6/browser";
import { appPage, homePage } from "../utils/web-pages.ts";

export const options = {
  scenarios: {
    web_smoke_test: {
      executor: "constant-vus",
      vus: 1,
      duration: "5s",
      options: {
        browser: { type: "chromium" },
      },
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<100"], // 95% of requests should be below 100ms
    http_req_failed: ["rate<0.01"], // Less than 1% of requests should fail
    browser_http_req_duration: ["p(95)<1000"], // 95% of requests should be below 200ms
    browser_http_req_failed: ["rate<0.01"], // Less than 1% of requests should fail
  },
};

// Load cookies from JSON file
const cookieData: Cookie[] = JSON.parse(open("../cookies/auth-cookies.json"));

/**
 * This is the main entry point for the web smoke tests. The purpose of these smoke
 * tests is to quickly verify that the most important features of the application
 * are working as expected before running more comprehensive test suites.
 */
export default async function webSmokeTest() {
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

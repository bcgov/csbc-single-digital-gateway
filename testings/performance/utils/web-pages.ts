import { check } from "k6";
import { Page } from "k6/browser";
import http from "k6/http";

/**
 * Utility function for home page that checks if the page loads successfully,
 * returns a 200 status code, and contains expected text.
 */
export const homePage = async () => {
  const response = http.get(`${__ENV.WEB_APP_URL}/`);
  check(response, {
    "Home page returns status 200": (res) => res.status === 200,
    "Home page contains expected text": (res) =>
      (res.body as string).includes("Single Digital Gateway"),
  });
};

/**
 * Utility function for app page that checks if the page loads successfully
 * and returns a 200 status code.
 * @param {Page} page The k6 browser page object.
 */
export const appPage = async (page: Page) => {
  await page
    .goto(`${__ENV.WEB_APP_URL}/app`, {
      waitUntil: "networkidle",
    })
    .then((response) => {
      check(response, {
        "App page returns status 200": (res) => res?.status() === 200,
      });
    });
};

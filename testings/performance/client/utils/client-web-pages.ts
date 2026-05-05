import { check } from "k6";
import { Page } from "k6/browser";
import http from "k6/http";

/**
 * Utility function for client home page that checks if the page loads
 * successfully, returns a 200 status code, and contains expected text.
 */
export const clientHomePage = async () => {
  const response = http.get(`${__ENV.WEB_APP_URL}/`);
  check(response, {
    "clientHomePage returns status 200": (res) => res.status === 200,
    "clientHomePage contains expected text": (res) =>
      (res.body as string).includes("Single Digital Gateway"),
  });
};

/**
 * Utility function for client app page that checks if the page loads
 * successfully and returns a 200 status code.
 * @param {Page} page The k6 browser page object.
 */
export const clientAppPage = async (page: Page) => {
  await page
    .goto(`${__ENV.WEB_APP_URL}/app`, {
      waitUntil: "networkidle",
    })
    .then((response) => {
      check(response, {
        "clientAppPage returns status 200": (res) => res?.status() === 200,
      });
    });
};

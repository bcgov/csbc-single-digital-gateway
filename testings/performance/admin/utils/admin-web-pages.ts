import { check } from "k6";
import { Page } from "k6/browser";

/**
 * Utility function for admin home page that checks if the page loads
 * successfully and returns a 200 status code.
 * @param {Page} page The k6 browser page object.
 */
export const adminHomePage = async (page: Page) => {
  await page
    .goto(`${__ENV.WEB_APP_URL}/admin`, {
      waitUntil: "networkidle",
    })
    .then((response) => {
      check(response, {
        "adminHomePage returns status 200": (res) => res?.status() === 200,
      });
    });
};

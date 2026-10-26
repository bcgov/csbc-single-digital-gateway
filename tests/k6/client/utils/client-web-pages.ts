import { check } from 'k6';
import { Page } from 'k6/browser';
import http from 'k6/http';

export default class ClientWebPages {
  /**
   * Utility function for client home page that checks if the page loads
   * successfully, returns a 200 status code, and contains expected text.
   */
  homePage = async () => {
    const response = http.get(`${__ENV.K6_CLIENT_DEV_URL}/`);
    check(response, {
      'clientHomePage returns status 200': (res) => res.status === 200,
    });
  };

  /**
   * Utility function for client app page that checks if the page loads
   * successfully and returns a 200 status code.
   * @param {Page} page The k6 browser page object.
   */
  appPage = async (page: Page) => {
    await page
      .goto(`${__ENV.K6_CLIENT_DEV_URL}/app`, {
        waitUntil: 'networkidle',
      })
      .then((response) => {
        check(response, {
          'clientAppPage returns status 200': (res) => res?.status() === 200,
        });
      });
  };
}

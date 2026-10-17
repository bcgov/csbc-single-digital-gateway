import { browser } from 'k6/browser';
import { clientCookieData } from '../../utils/cookies.ts';
import { clientAppPage, clientHomePage } from '../utils/client-web-pages.ts';

/**
 * This is the main entry point for the client web smoke tests.
 */
export default async function clientWebTest(testHomePage: boolean, testAppPage: boolean) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await context.addCookies(clientCookieData.cookies);

  try {
    if (testHomePage) {
      await clientHomePage();
    }

    if (testAppPage) {
      await clientAppPage(page);
    }
  } finally {
    await page.close();
    await context.close();
  }
}

declare global {
  namespace Cypress {
    interface Chainable {
      loginToObtainCookies(): Chainable<void>;
      restoreCookiesFromFile(): Chainable<void>;
    }
  }
}

export {};

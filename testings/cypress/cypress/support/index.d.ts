import { IdpType } from "../utils/idp";

declare global {
  namespace Cypress {
    interface Chainable {
      bcscLoginToObtainCookies(): Chainable<void>;
      idirLoginToObtainCookies(): Chainable<void>;
      restoreCookiesFromFile(idpType: IdpType): Chainable<void>;
    }
  }
}

export {};

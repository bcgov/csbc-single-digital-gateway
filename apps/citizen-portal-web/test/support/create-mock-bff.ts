import { vi } from 'vitest';
import { jsonResponse } from './render-app';
import {
  authedUser,
  applicationDetail,
  form,
  draft,
  version,
  serviceDetail,
  services,
  urlCalls,
  applicationsList,
  FEED,
} from './fixtures';
import { PREFERENCES } from './render-page';

/** A detail fixture with status/reason overrides. */
export const detailWith = (over: Partial<typeof applicationDetail>) => ({
  ...applicationDetail,
  ...over,
});

/** Options passed to `createMockBff`. */
export type CreateMockBffOptions = {
  detail?: any;
  [key: string]: any;
};

/**
 * Auth options for auth state.
 * authPending - Whether the auth fetch should fail.
 * user - The user to be used for the auth state.
 * me - The response for the me endpoint.
 * meNotFound - Whether the me fetch should fail.
 */
export type AuthOptions = {
  authPending?: boolean;
  user?: typeof authedUser | null;
  me?: Response | Promise<Response>;
  meNotFound?: boolean;
};

/**
 * Application options for application page.
 * failedResponse - Whether the application fetch should fail.
 * submissionFailed - Whether the application submission should fail.
 * submissionUnprocessed - Whether the application submission should be unprocessed.
 * hasNoData - Whether the application data should be missing.
 * postPromise - The post promise for the application submission.
 * patchPromise - The patch promise for the application submission.
 * submitPromise - The submit promise for the application submission.
 */
export type ApplicationsOptions = {
  failedResponse?: boolean;
  submissionFailed?: boolean;
  submissionUnprocessed?: boolean;
  hasNoData?: boolean;
  postPromise?: boolean | Promise<Response>;
  patchPromise?: boolean | Promise<Response>;
  submitPromise?: boolean | Promise<Response>;
};

/**
 * Service options for service agreements page.
 * formNotFound - Whether the form fetch should fail.
 */
export type ServicesOptions = {
  formNotFound?: boolean;
};

/**
 * Service agreements options for service agreements page.
 * agreementDetailNotFound - Whether the agreement detail fetch should fail.
 * errorOnAgreements - Whether the agreements fetch should fail.
 * agreementList - The list of agreements to be used for the service agreements page.
 * serviceAgreements - The list of service agreements to be used for the service agreements page.
 * agreementDetail - The detail of the agreement to be used for the service agreements page.
 * serviceAgreement - The detail of the service agreement to be used for the service agreements page.
 */
export type ServiceAgreementsOptions = {
  agreementDetailNotFound?: boolean;
  errorOnAgreements?: boolean;
  agreementList?: unknown[] | Response;
  serviceAgreements?: unknown[] | Response;
  agreementDetail?: any;
  serviceAgreement?: any;
};

/**
 * Notification preferences options for notification preferences page.
 * preferences - The preferences to be used for the notification preferences page.
 * errorOnPreferences - Whether the preferences fetch should fail.
 * errorOnSave - Whether the preferences save should fail.
 * delaySaveMs - The delay in milliseconds for the preferences save.
 * delayPreferencesMs - The delay in milliseconds for the preferences fetch.
 */
export type NotificationPreferencesOptions = {
  preferences?: typeof PREFERENCES | null;
  errorOnPreferences?: boolean;
  errorOnSave?: boolean;
  delaySaveMs?: number;
  delayPreferencesMs?: number;
};

/**
 * Creates a mock BFF (Backend for Frontend) server that can be used for testing.
 * @param param - Options for configuring the mock BFF.
 * @param param.application - The response for the application endpoint.
 * @param param.applications - The response for the applications endpoint.
 * @param param.agreements - The response for the agreements endpoint.
 * @param param.me - The response for the me endpoint.
 * @param param.ver - The response for the version endpoint.
 * @param param.svc - The response for the service endpoint.
 * @param param.metadata - The metadata to be used for the application.
 * @param param.form - The form to be used for the application.
 * @param param.draft - The draft to be used for the application.
 * @param param.services - The services to be used for the application.
 * @param param.calls - The calls to be recorded for the application.
 * @param param.preferences - The preferences to be used for the application.
 * @param param.puts - The puts to be recorded for the application.
 * @param param.serviceAgreements - The service agreements to be used for the application.
 * @param param.serviceAgreement - The service agreement detail to be used for the application.
 * @param param.patchResponse - The patch response to be used for the application.
 * @param param.submitResponse - The submit response to be used for the application.
 * @param param.options - Options for configuring the mock BFF.
 * @param param.authOptions - Options for configuring the authorized user state.
 * @param param.applicationsOptions - Options for configuring the applications state.
 * @param param.servicesOptions - Options for configuring the services state.
 * @param param.serviceAgreementsOptions - Options for configuring the service agreements state.
 * @param param.notificationPreferencesOptions - Options for configuring the notification preferences state.
 * @returns A mock BFF server that can be used for testing.
 */
export function createMockBff({
  application = jsonResponse(applicationDetail),
  applications = jsonResponse({ items: applicationsList }),
  agreements = jsonResponse({ items: [] }),
  me = jsonResponse(authedUser),
  ver = jsonResponse(version),
  svc = jsonResponse(serviceDetail),
  metadata = applicationDetail,
  form: formParam = form,
  draft: draftParam = draft,
  services: servicesParam = services,
  calls = urlCalls,
  preferences = jsonResponse(PREFERENCES),
  puts = [],
  serviceAgreement,
  serviceAgreements,
  patchResponse,
  submitResponse,
  options,
  authOptions,
  applicationsOptions,
  servicesOptions,
  serviceAgreementsOptions,
  notificationPreferencesOptions,
}: {
  application?: Response | Promise<Response>;
  applications?: Response | Promise<Response>;
  agreements?: Response | Promise<Response>;
  me?: Response | Promise<Response>;
  ver?: Response | Promise<Response>;
  svc?: Response | Promise<Response>;
  preferences?: any;
  puts?: string[];
  serviceAgreements?: any;
  serviceAgreement?: any;
  metadata?: any;
  form?: any;
  draft?: any;
  services?: any[];
  patchResponse?: Response | Promise<Response>;
  submitResponse?: Response | Promise<Response>;
  calls?: string[];
  options?: CreateMockBffOptions;
  authOptions?: AuthOptions;
  applicationsOptions?: ApplicationsOptions;
  servicesOptions?: ServicesOptions;
  serviceAgreementsOptions?: ServiceAgreementsOptions;
  notificationPreferencesOptions?: NotificationPreferencesOptions;
} = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    if (calls) {
      calls.push(`${method} ${url}`);
    }
    // BFF: /auth/me
    if (url.includes('/auth/me')) {
      if (authOptions?.authPending) {
        return new Promise(() => {});
      }
      if (authOptions?.user === null) {
        return new Response(null, { status: 401 });
      }
      if (authOptions?.meNotFound) {
        return new Response(null, { status: 404 });
      }
      if (authOptions?.user) {
        return jsonResponse(authOptions.user);
      }
      const meResponse = authOptions?.me ?? me;
      return meResponse instanceof Response ? meResponse.clone() : meResponse;
    }
    // BFF: /auth/logout
    if (url.includes('/auth/logout')) {
      return new Response(null, { status: 204 });
    }
    // BFF: /v1/services
    if (url.includes('/v1/services')) {
      if (url.includes('/applications/')) {
        if (servicesOptions?.formNotFound) {
          return new Response(null, { status: 404 });
        }
        return formParam instanceof Response ? formParam.clone() : jsonResponse(formParam);
      }
      if (url.includes('/versions/')) {
        return ver instanceof Response ? ver.clone() : jsonResponse(ver);
      }
      if (/\/v1\/services\/[^/?]+$/.test(url)) {
        return svc instanceof Response ? svc.clone() : jsonResponse(svc);
      }
      return servicesParam instanceof Response
        ? servicesParam.clone()
        : jsonResponse({ items: servicesParam });
    }
    // BFF: /v1/me/services/
    if (url.includes('/v1/me/services/') && url.includes('/agreements')) {
      return agreements instanceof Response ? agreements.clone() : agreements;
    }
    // BFF: /v1/me/service-agreements
    if (url.includes('/v1/me/service-agreements/')) {
      const detailRes =
        serviceAgreement ??
        serviceAgreementsOptions?.agreementDetail ??
        serviceAgreementsOptions?.serviceAgreement;
      if (serviceAgreementsOptions?.agreementDetailNotFound) {
        return new Response(null, { status: 404 });
      }
      if (detailRes !== undefined) {
        return detailRes instanceof Response ? detailRes.clone() : jsonResponse(detailRes);
      }
      return new Response(null, { status: 404 });
    }
    if (url.includes('/v1/me/service-agreements')) {
      if (serviceAgreementsOptions?.errorOnAgreements) {
        return new Response(null, { status: 500 });
      }
      const listResponse =
        serviceAgreements ??
        serviceAgreementsOptions?.agreementList ??
        serviceAgreementsOptions?.serviceAgreements;
      if (listResponse !== undefined) {
        if (listResponse instanceof Response) return listResponse.clone();
        if (Array.isArray(listResponse)) return jsonResponse({ items: listResponse });
        return jsonResponse(listResponse);
      }
      return jsonResponse({ items: [] });
    }
    // BFF: /v1/me/applications
    if (url.includes('/v1/me/applications')) {
      if (method === 'GET') {
        // BFF: GET /v1/me/applications/{applicationId}
        if (url.endsWith('/sub1')) {
          return application instanceof Response ? application.clone() : application;
        }
        // BFF: GET /v1/me/applications
        return applications instanceof Response ? applications.clone() : applications;
      }
      if (method === 'POST') {
        // BFF: POST /v1/me/applications/{applicationId}/revise
        if (url.endsWith('/sub1/revise')) {
          return jsonResponse({
            id: metadata.id,
            formId: metadata.formId,
            formVersionId: metadata.formVersionId,
            status: 'draft',
            data: metadata.data,
            reference: metadata.reference,
            createdAt: metadata.createdAt,
            updatedAt: metadata.updatedAt,
            submittedAt: null,
          });
        }
        // BFF: POST /v1/me/applications/submit
        if (url.endsWith('/submit')) {
          if (applicationsOptions?.submissionFailed) {
            return new Response(null, { status: 500 });
          }
          if (applicationsOptions?.submissionUnprocessed) {
            return new Response(null, { status: 422 });
          }
          if (submitResponse) {
            return submitResponse instanceof Response ? submitResponse.clone() : submitResponse;
          }
          if (
            applicationsOptions?.postPromise &&
            typeof applicationsOptions.postPromise !== 'boolean'
          ) {
            return applicationsOptions.postPromise;
          }
          if (
            applicationsOptions?.submitPromise &&
            typeof applicationsOptions.submitPromise !== 'boolean'
          ) {
            return applicationsOptions.submitPromise;
          }
          const submittedData = {
            ...draftParam,
            ...metadata,
            status: 'pending',
            submittedAt: '2026-06-30T00:00:00.000Z',
          };
          return jsonResponse(submittedData);
        }
        if (applicationsOptions?.failedResponse) {
          return new Response(null, { status: 500 });
        }
        if (applicationsOptions?.hasNoData) {
          return jsonResponse({ ...draftParam, data: undefined });
        }
        return draftParam instanceof Response ? draftParam.clone() : jsonResponse(draftParam);
      }
    }

    if (method === 'PATCH') {
      if (patchResponse) {
        return patchResponse instanceof Response ? patchResponse.clone() : patchResponse;
      }
      if (options?.patchPromise && typeof options.patchPromise !== 'boolean') {
        return options.patchPromise;
      }
      return draftParam instanceof Response ? draftParam.clone() : jsonResponse(draftParam);
    }
    // BFF: /v1/notifications/unread-count
    if (url.includes('/notifications/unread-count')) {
      return jsonResponse({ count: 1 });
    }
    // BFF: /v1/notifications/read-all
    if (url.includes('/read-all')) {
      return jsonResponse({ updated: 1 });
    }
    // BFF: /v1/notifications/read/{notificationId}
    if (url.includes('/read')) {
      return jsonResponse({ ...FEED.items[0], readAt: new Date().toISOString() });
    }
    // BFF: /v1/notification-preferences
    if (url.includes('/notification-preferences')) {
      if (method === 'PUT') {
        if (notificationPreferencesOptions?.delaySaveMs) {
          await new Promise((resolve) =>
            setTimeout(resolve, notificationPreferencesOptions.delaySaveMs),
          );
        }
        if (notificationPreferencesOptions?.errorOnSave) {
          return new Response(null, { status: 500 });
        }
        if (init?.body !== undefined) {
          puts.push(String(init.body));
        }
        const body = init?.body ? (JSON.parse(String(init.body)) as typeof PREFERENCES) : {};
        const basePreferences =
          notificationPreferencesOptions?.preferences !== undefined
            ? notificationPreferencesOptions.preferences
            : preferences;
        const baseObj =
          basePreferences instanceof Response ? PREFERENCES : (basePreferences ?? PREFERENCES);
        return jsonResponse({ ...baseObj, ...body });
      }
      if (notificationPreferencesOptions?.errorOnPreferences) {
        return new Response(null, { status: 500 });
      }
      if (notificationPreferencesOptions?.delayPreferencesMs) {
        await new Promise((resolve) =>
          setTimeout(resolve, notificationPreferencesOptions.delayPreferencesMs),
        );
      }
      const resultPreferences =
        notificationPreferencesOptions?.preferences !== undefined
          ? notificationPreferencesOptions.preferences
          : preferences;
      return resultPreferences instanceof Response
        ? resultPreferences.clone()
        : jsonResponse(resultPreferences);
    }
    // BFF: /v1/me/notifications
    if (url.includes('/v1/me/notifications')) {
      return jsonResponse(FEED);
    }
    return new Response(null, { status: 404 });
  });

  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

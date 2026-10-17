import { group } from 'k6';
import { clientCookieData, setCookies, UserType } from '../../utils/cookies.ts';
import { clientAuthLoginEndpoint, clientAuthMeEndpoint } from '../utils/client-api-auth.ts';
import {
  clientMeApplicationsCreateOneApplication,
  clientMeApplicationsGetActions,
  clientMeApplicationsGetMessages,
  clientMeApplicationsGetOneApplication,
  clientMeApplicationsGetOneServiceAgreement,
  clientMeApplicationsGetServiceAgreements,
  clientMeApplicationsList,
  clientMeApplicationsReviseOneApplication,
  clientMeApplicationsSubmitOneApplication,
  clientMeApplicationsUpdateOneApplication,
} from '../utils/client-api-me-applications.ts';
import {
  clientServicesFindAllServices,
  clientServicesFindOneApplicationForm,
  clientServicesFindOneService,
  clientServicesFindOneVersion,
  clientServicesGetApplicationProcess,
} from '../utils/client-api-services.ts';
import { clientHealthLiveEndpoint, clientHealthReadyEndpoint } from '../utils/client-api-health.ts';
import {
  clientGeoFindAddressSearch,
  clientGeoFindAddressSearchRegions,
  clientGeoFindAllCountries,
  clientGeoFindStatesByCountry,
} from '../utils/client-api-geo.ts';
import {
  clientConsentFindServiceAgreements,
  clientConsentSubmitAgreementConsent,
} from '../utils/client-api-consent.ts';
import {
  clientNotificationsFindNotifications,
  clientNotificationsFindNotificationsReadAll,
  clientNotificationsFindNotificationsUnreadCount,
  clientNotificationsGetPreferences,
  clientNotificationsReadByDeliveryId,
  clientNotificationsUpdatePreferences,
} from '../utils/client-api-notifications.ts';

/**
 * This is the main entry point for the client API tests.
 */
export default function clientApiTest(
  testAuthHealth: boolean = false,
  testServices: boolean = false,
  testGeo: boolean = false,
  testMeApplications: boolean = false,
  testConsent: boolean = false,
  testNotifications: boolean = false,
) {
  setCookies(clientCookieData, UserType.Client);

  const serviceId = '123e4567-e89b-12d3-a456-426614174000';
  const versionId = '123e4567-e89b-12d3-a456-426614174001';
  const applicationId = '123e4567-e89b-12d3-a456-426614174002';
  const formId = '123e4567-e89b-12d3-a456-426614174003';
  const serviceAgreementId = '123e4567-e89b-12d3-a456-426614174004';
  const countryId = '123e4567-e89b-12d3-a456-426614174005';
  const deliveryId = '123e4567-e89b-12d3-a456-426614174006';

  if (testAuthHealth) {
    group('Client API - Auth', () => {
      clientAuthLoginEndpoint();
      clientAuthMeEndpoint();
    });

    group('Client API - Health', () => {
      clientHealthLiveEndpoint();
      clientHealthReadyEndpoint();
    });
  }

  if (testServices) {
    group('Client API - Services', () => {
      // Find all services endpoint
      clientServicesFindAllServices();

      // Find one service endpoint
      clientServicesFindOneService(serviceId);

      // Find one version endpoint
      clientServicesFindOneVersion(serviceId, versionId);

      // Find one application form endpoint
      clientServicesFindOneApplicationForm(serviceId, formId);

      // Get application process endpoint
      clientServicesGetApplicationProcess(serviceId, versionId, applicationId);
    });
  }

  if (testGeo) {
    group('Client API - Geo', () => {
      // Find all countries endpoint
      clientGeoFindAllCountries();

      // Find states within a country endpoint
      clientGeoFindStatesByCountry(countryId);

      // Find address-search endpoint
      clientGeoFindAddressSearch();

      // Find regions by address-search endpoint
      clientGeoFindAddressSearchRegions();
    });
  }

  if (testMeApplications) {
    group('Client API - Me Applications', () => {
      // List for user endpoint
      clientMeApplicationsList();

      // Create one application endpoint
      clientMeApplicationsCreateOneApplication();

      // Get one application endpoint
      clientMeApplicationsGetOneApplication(applicationId);

      // Update one application endpoint
      clientMeApplicationsUpdateOneApplication(applicationId);

      // Submit one application endpoint
      clientMeApplicationsSubmitOneApplication(applicationId);

      // Revise one application endpoint
      clientMeApplicationsReviseOneApplication(applicationId);

      // Get actions endpoint
      clientMeApplicationsGetActions(applicationId);

      // Get messages endpoint
      clientMeApplicationsGetMessages(applicationId);

      // Get service agreements endpoint
      clientMeApplicationsGetServiceAgreements();

      // Get one service agreement endpoint
      clientMeApplicationsGetOneServiceAgreement(serviceAgreementId);
    });
  }

  if (testConsent) {
    group('Client API - Consent', () => {
      // List service agreements endpoint
      clientConsentFindServiceAgreements(serviceId);

      // Submit agreement consent endpoint
      clientConsentSubmitAgreementConsent();
    });
  }

  if (testNotifications) {
    group('Client API - Notifications', () => {
      // List notifications endpoint
      clientNotificationsFindNotifications();

      // Unread count endpoint
      clientNotificationsFindNotificationsUnreadCount();

      // Read all notifications endpoint
      clientNotificationsFindNotificationsReadAll();

      // Read one notification endpoint
      clientNotificationsReadByDeliveryId(deliveryId);

      // Get notification preferences endpoint
      clientNotificationsGetPreferences();

      // Update notification preferences endpoint
      clientNotificationsUpdatePreferences();
    });
  }
}

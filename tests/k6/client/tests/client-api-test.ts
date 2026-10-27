import { group } from 'k6';
import { clientCookieData, setCookies, UserType } from '../../utils/cookies.ts';
import ClientHealthAPIs from '../utils/client-api-health.ts';
import ClientAuthAPIs from '../utils/client-api-auth.ts';
import ClientServicesAPIS from '../utils/client-api-services.ts';
import ClientGEOAPIs from '../utils/client-api-geo.ts';
import ClientMeApplicationsAPIs from '../utils/client-api-me-applications.ts';
import ClientConsentAPIs from '../utils/client-api-consent.ts';
import ClientNotificationsAPIs from '../utils/client-api-notifications.ts';

/**
 * This is the main entry point for the client API tests.
 */
export default function clientApiTest(options?: {
  testAuthHealth: boolean;
  testServices: boolean;
  testGeo: boolean;
  testMeApplications: boolean;
  testConsent: boolean;
  testNotifications: boolean;
}) {
  setCookies(clientCookieData, UserType.Client);

  const serviceId = '123e4567-e89b-12d3-a456-426614174000';
  const versionId = '123e4567-e89b-12d3-a456-426614174001';
  const applicationId = '123e4567-e89b-12d3-a456-426614174002';
  const formId = '123e4567-e89b-12d3-a456-426614174003';
  const serviceAgreementId = '123e4567-e89b-12d3-a456-426614174004';
  const countryId = '123e4567-e89b-12d3-a456-426614174005';
  const deliveryId = '123e4567-e89b-12d3-a456-426614174006';

  if (options?.testAuthHealth) {
    group('Client API - Auth', () => {
      const clientAuth = new ClientAuthAPIs();
      // Login endpoint
      clientAuth.loginEndpoint();

      // Me endpoint
      clientAuth.meEndpoint();
    });

    group('Client API - Health', () => {
      const clientHealth = new ClientHealthAPIs();
      // Live endpoint
      clientHealth.liveEndpoint();

      // Ready endpoint
      clientHealth.readyEndpoint();
    });
  }

  if (options?.testServices) {
    group('Client API - Services', () => {
      const clientServices = new ClientServicesAPIS();
      // Find all services endpoint
      clientServices.findAllServices();

      // Find one service endpoint
      clientServices.findOneService(serviceId);

      // Find one version endpoint
      clientServices.findOneVersion(serviceId, versionId);

      // Find one application form endpoint
      clientServices.findOneApplicationForm(serviceId, formId);

      // Get application process endpoint
      clientServices.getApplicationProcess(serviceId, versionId, applicationId);
    });
  }

  if (options?.testGeo) {
    group('Client API - Geo', () => {
      const clientGeo = new ClientGEOAPIs();
      // Find all countries endpoint
      clientGeo.findAllCountries();

      // Find states within a country endpoint
      clientGeo.findStatesByCountry(countryId);

      // Find address-search endpoint
      clientGeo.findAddressSearch();

      // Find regions by address-search endpoint
      clientGeo.findAddressSearchRegions();
    });
  }

  if (options?.testMeApplications) {
    group('Client API - Me Applications', () => {
      const clientMeApplications = new ClientMeApplicationsAPIs();
      // List for user endpoint
      clientMeApplications.list();

      // Create one application endpoint
      clientMeApplications.createOneApplication();

      // Get one application endpoint
      clientMeApplications.getOneApplication(applicationId);

      // Update one application endpoint
      clientMeApplications.updateOneApplication(applicationId);

      // Submit one application endpoint
      clientMeApplications.submitOneApplication(applicationId);

      // Revise one application endpoint
      clientMeApplications.reviseOneApplication(applicationId);

      // Get actions endpoint
      clientMeApplications.getActions(applicationId);

      // Get messages endpoint
      clientMeApplications.getMessages(applicationId);

      // Get service agreements endpoint
      clientMeApplications.getServiceAgreements();

      // Get one service agreement endpoint
      clientMeApplications.getOneServiceAgreement(serviceAgreementId);
    });
  }

  if (options?.testConsent) {
    group('Client API - Consent', () => {
      const clientConsent = new ClientConsentAPIs();
      // List service agreements endpoint
      clientConsent.findServiceAgreements(serviceId);

      // Submit agreement consent endpoint
      clientConsent.submitAgreementConsent();
    });
  }

  if (options?.testNotifications) {
    group('Client API - Notifications', () => {
      const clientNotifications = new ClientNotificationsAPIs();
      // List notifications endpoint
      clientNotifications.findNotifications();

      // Unread count endpoint
      clientNotifications.findNotificationsUnreadCount();

      // Read all notifications endpoint
      clientNotifications.findNotificationsReadAll();

      // Read one notification endpoint
      clientNotifications.readByDeliveryId(deliveryId);

      // Get notification preferences endpoint
      clientNotifications.getPreferences();

      // Update notification preferences endpoint
      clientNotifications.updatePreferences();
    });
  }
}

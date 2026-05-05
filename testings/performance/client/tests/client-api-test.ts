import { group } from "k6";
import { bcscCookieData, setCookies, UserType } from "../../utils/cookies.ts";
import {
  clientApplicationsGetApplication,
  clientApplicationsSubmitApplication,
} from "../utils/client-api-applications.ts";
import { bcscMeEndpoint } from "../utils/client-api-auth.ts";
import {
  clientMeApplicationsGetActions,
  clientMeApplicationsGetMessages,
  clientMeApplicationsGetOneApplication,
  clientMeApplicationsListForUser,
} from "../utils/client-api-my-applications.ts";
import {
  clientServicesFindAllServices,
  clientServicesFindOneService,
  clientServicesFindOneVersion,
  clientServicesGetApplicationProcess,
} from "../utils/client-api-services.ts";

/**
 * This is the main entry point for the client API tests.
 */
export default function clientApiTest(
  testMeApplications: boolean,
  testApplications: boolean,
  testServices: boolean,
) {
  setCookies(bcscCookieData, UserType.Client);

  const serviceId = "123e4567-e89b-12d3-a456-426614174000";
  const versionId = "123e4567-e89b-12d3-a456-426614174001";
  const applicationId = "123e4567-e89b-12d3-a456-426614174002";

  // BCSC/Me endpoint
  bcscMeEndpoint();

  if (testMeApplications) {
    group("Client API - Me Applications", () => {
      // List for user endpoint
      clientMeApplicationsListForUser();

      // Get one application endpoint
      clientMeApplicationsGetOneApplication(applicationId);

      // Get actions endpoint
      clientMeApplicationsGetActions(applicationId);

      // Get messages endpoint
      clientMeApplicationsGetMessages(applicationId);
    });
  }

  if (testApplications) {
    group("Client API - Applications", () => {
      // Submit application
      clientApplicationsSubmitApplication(serviceId, versionId, applicationId);

      // Get application
      clientApplicationsGetApplication(serviceId);
    });
  }

  if (testServices) {
    group("Client API - Services", () => {
      // Find all services endpoint
      clientServicesFindAllServices();

      // Find one service endpoint
      clientServicesFindOneService(serviceId);

      // Find one version endpoint
      clientServicesFindOneVersion(serviceId, versionId);

      // Get application process endpoint
      clientServicesGetApplicationProcess(serviceId, versionId, applicationId);
    });
  }
}

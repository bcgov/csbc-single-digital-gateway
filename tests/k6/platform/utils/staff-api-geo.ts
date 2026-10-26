import { check } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';

export default class StaffGeoAPIs {
  /**
   * Staff geo find all countries endpoint.
   */
  findAllCountries() {
    const response = http.get(`${__ENV.K6_PLATFORM_DEV_URL}/api/v1/geo/countries`);
    if (response.error) {
      exec.test.abort(`staffGeoFindAllCountries failed to load: ${response.error}`);
    }
    check(response, {
      'staffGeoFindAllCountries returns status 200': (res) => res.status === 200,
    });
  }

  /**
   * Staff geo find states within a country endpoint.
   * @param {string} countryId - Country ID in uuid.
   */
  findStatesByCountry(countryId: string) {
    const response = http.get(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/geo/countries/${countryId}/states`,
    );
    if (response.error) {
      exec.test.abort(`staffGeoFindStatesByCountry failed to load: ${response.error}`);
    }
    check(response, {
      'staffGeoFindStatesByCountry returns status 200': (res) => res.status === 200,
    });
  }

  /**
   * Staff geo find regions by address-search endpoint.
   */
  findAddressSearchRegions() {
    const response = http.get(`${__ENV.K6_PLATFORM_DEV_URL}/api/v1/geo/address-search/regions`);
    if (response.error) {
      exec.test.abort(`staffGeoFindAddressSearchRegions failed to load: ${response.error}`);
    }
    check(response, {
      'staffGeoFindAddressSearchRegions returns status 200': (res) => res.status === 200,
    });
  }

  /**
   * Staff geo find address-search endpoint.
   */
  findAddressSearch() {
    const response = http.get(`${__ENV.K6_PLATFORM_DEV_URL}/api/v1/geo/address-search`);
    if (response.error) {
      exec.test.abort(`staffGeoFindAddressSearch failed to load: ${response.error}`);
    }
    check(response, {
      'staffGeoFindAddressSearch returns status 400': (res) => res.status === 400,
    });
  }
}

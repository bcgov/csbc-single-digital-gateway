import { check } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';

export default class ClientGeoAPIs {
  /**
   * Client geo find all countries endpoint.
   */
  findAllCountries = () => {
    const response = http.get(
      `${__ENV.K6_CLIENT_DEV_URL}/api/v1/geo/countries?page=1&limit=1&local=en`,
    );
    if (response.error) {
      exec.test.abort(`clientGeoFindAllCountries failed to load: ${response.error}`);
    }
    check(response, {
      'clientGeoFindAllCountries returns status 200': (res) => res.status === 200,
    });
  };

  /**
   * Client geo find states within a country endpoint.
   * @param {string} countryId - Country ID in uuid.
   */
  findStatesByCountry = (countryId: string) => {
    const response = http.get(
      `${__ENV.K6_CLIENT_DEV_URL}/api/v1/geo/countries/${countryId}/states`,
    );
    if (response.error) {
      exec.test.abort(`clientGeoFindStatesByCountry failed to load: ${response.error}`);
    }
    check(response, {
      'clientGeoFindStatesByCountry returns status 400': (res) => res.status === 400,
    });
  };

  /**
   * Client geo find address-search endpoint.
   */
  findAddressSearch = () => {
    const response = http.get(`${__ENV.K6_CLIENT_DEV_URL}/api/v1/geo/address-search`);
    if (response.error) {
      exec.test.abort(`clientGeoFindAddressSearch failed to load: ${response.error}`);
    }
    check(response, {
      'clientGeoFindAddressSearch returns status 400': (res) => res.status === 400,
    });
  };

  /**
   * Client geo find regions by address-search endpoint.
   */
  findAddressSearchRegions = () => {
    const response = http.get(`${__ENV.K6_CLIENT_DEV_URL}/api/v1/geo/address-search/regions`);
    if (response.error) {
      exec.test.abort(`clientGeoFindAddressSearchRegions failed to load: ${response.error}`);
    }
    check(response, {
      'clientGeoFindAddressSearchRegions returns status 200': (res) => res.status === 200,
    });
  };
}

import { check } from "k6";
import exec from "k6/execution";
import http from "k6/http";
import { AddMemberBodyRole, CreateChildOrgUnitBodyType } from "./enums";

/**
 * Admin organization units find all org-units endpoint.
 */
export const adminOrgUnitsFindAllOrgUnits = () => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/admin/org-units?page=1&limit=1`,
  );
  if (response.error) {
    exec.test.abort(
      `adminOrgUnitsFindAllOrgUnits failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminOrgUnitsFindAllOrgUnits returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin organization units find one org-unit endpoint.
 * @param {string} id - Organization unit ID in uuid.
 */
export const adminOrgUnitsFindOneOrgUnit = (id: string) => {
  const response = http.get(`${__ENV.WEB_APP_URL}/api/admin/org-units/${id}`);
  if (response.error) {
    exec.test.abort(
      `adminOrgUnitsFindOneOrgUnit failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminOrgUnitsFindOneOrgUnit returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin organization units get children endpoint.
 * @param {string} id - Organization unit ID in uuid.
 */
export const adminOrgUnitsGetChildren = (id: string) => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/admin/org-units/${id}/children`,
  );
  if (response.error) {
    exec.test.abort(
      `adminOrgUnitsGetChildren failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminOrgUnitsGetChildren returns status 403": (res) => res.status === 403,
  });
};

/**
 * Admin organization units create child endpoint.
 * @param {string} id - Organization unit ID in uuid.
 * @param {object} body - Request body object.
 */
export const adminOrgUnitsCreateChild = (
  id: string,
  body: {
    name: string;
    type: CreateChildOrgUnitBodyType;
  },
) => {
  const response = http.post(
    `${__ENV.WEB_APP_URL}/api/admin/org-units/${id}/children`,
    body,
  );
  if (response.error) {
    exec.test.abort(
      `adminOrgUnitsCreateChild failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminOrgUnitsCreateChild returns status 403": (res) => res.status === 403,
  });
};

/**
 * Admin organization units get children types endpoint.
 * @param {string} id - Organization unit ID in uuid.
 */
export const adminOrgUnitsGetChildrenTypes = (id: string) => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/admin/org-units/${id}/allowed-child-types`,
  );
  if (response.error) {
    exec.test.abort(
      `adminOrgUnitsGetChildrenTypes failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminOrgUnitsGetChildrenTypes returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin organization units get members endpoint.
 * @param {string} id - Organization unit ID in uuid.
 */
export const adminOrgUnitsGetMembers = (id: string) => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/admin/org-units/${id}/members`,
  );
  if (response.error) {
    exec.test.abort(
      `adminOrgUnitsGetMembers failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminOrgUnitsGetMembers returns status 403": (res) => res.status === 403,
  });
};

/**
 * Admin organization units search users endpoint.
 * @param {string} id - Organization unit ID in uuid.
 */
export const adminOrgUnitsSearchUsers = (id: string) => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/admin/org-units/${id}/members/search`,
  );
  if (response.error) {
    exec.test.abort(
      `adminOrgUnitsSearchUsers failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminOrgUnitsSearchUsers returns status 403": (res) => res.status === 403,
  });
};

/**
 * Admin organization units add member endpoint.
 * @param {string} id - Organization unit ID in uuid.
 */
export const adminOrgUnitsAddMember = (
  id: string,
  body: {
    userId: string;
    role: AddMemberBodyRole;
  },
) => {
  const response = http.post(
    `${__ENV.WEB_APP_URL}/api/admin/org-units/${id}/members`,
    body,
  );
  if (response.error) {
    exec.test.abort(`adminOrgUnitsAddMember failed to load: ${response.error}`);
  }
  check(response, {
    "adminOrgUnitsAddMember returns status 403": (res) => res.status === 403,
  });
};

/**
 * Admin organization units remove member endpoint.
 * @param {string} id - Organization unit ID in uuid.
 */
export const adminOrgUnitsRemoveMember = (id: string, memberId: string) => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/admin/org-units/${id}/members/${memberId}`,
  );
  if (response.error) {
    exec.test.abort(
      `adminOrgUnitsRemoveMember failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminOrgUnitsRemoveMember returns status 404": (res) => res.status === 404,
  });
};

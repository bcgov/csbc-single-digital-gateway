import { check } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';

export default class StaffSubmissionsAPIs {
  /**
   * Staff submissions find all submissions endpoint.
   * @param {string} [workspaceId] - Workspace ID in uuid.
   */
  findAllSubmissions = (workspaceId?: string) => {
    const url = workspaceId
      ? `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/submissions?workspaceId=${workspaceId}`
      : `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/submissions`;
    const response = http.get(url);
    if (response.error) {
      exec.test.abort(`staffSubmissionsFindAllSubmissions failed to load: ${response.error}`);
    }
    check(response, {
      'staffSubmissionsFindAllSubmissions returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff submissions find one submission endpoint.
   * @param {string} id - Submission ID in uuid.
   */
  findOneSubmission = (id: string) => {
    const response = http.get(`${__ENV.K6_PLATFORM_DEV_URL}/api/v1/submissions/${id}`);
    if (response.error) {
      exec.test.abort(`staffSubmissionsFindOneSubmission failed to load: ${response.error}`);
    }
    check(response, {
      'staffSubmissionsFindOneSubmission returns status 404': (res) => res.status === 404,
    });
  };

  /**
   * Staff submissions review submission endpoint.
   * @param {string} id - Submission ID in uuid.
   * @param {object} body - Request body object.
   */
  reviewSubmission = (
    id: string,
    body: {
      decision: 'approve' | 'reject' | 'request_changes' | string;
      reason?: string;
    },
  ) => {
    const response = http.post(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/submissions/${id}/review`,
      JSON.stringify(body),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    if (response.error) {
      exec.test.abort(`staffSubmissionsReviewSubmission failed to load: ${response.error}`);
    }
    check(response, {
      'staffSubmissionsReviewSubmission returns status 403': (res) => res.status === 403,
    });
  };
}

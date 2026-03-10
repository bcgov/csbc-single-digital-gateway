import axios from "axios";

export const consentManagerApi = axios.create({
  baseURL: `${import.meta.env.VITE_API_URI}/v1/consent-proxy`,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// CSRF: read csrf-token cookie and set X-CSRF-Token header on mutating requests
consentManagerApi.interceptors.request.use((request) => {
  if (
    request.method &&
    ["post", "put", "patch", "delete"].includes(request.method.toLowerCase())
  ) {
    const csrfToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("csrf-token="))
      ?.split("=")[1];

    if (csrfToken) {
      request.headers["X-CSRF-Token"] = csrfToken;
    }
  }

  return request;
});

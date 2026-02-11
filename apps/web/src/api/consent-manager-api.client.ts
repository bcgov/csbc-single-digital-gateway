import axios from "axios";
import type { User } from "oidc-client-ts";

export const consentManagerApi = axios.create({
  baseURL: import.meta.env.VITE_CONSENT_MANAGER_API_URL,
  headers: { "Content-Type": "application/json" },
});

// Apply Authorization header if token is available
consentManagerApi.interceptors.request.use((request) => {
  const sessionString = sessionStorage.getItem(
    `oidc.user:${import.meta.env.VITE_OIDC_ISSUER}:${import.meta.env.VITE_OIDC_CLIENT_ID}`
  );
  const session: User = sessionString ? JSON.parse(sessionString) : undefined;

  if (session) {
    request.headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  return request;
});

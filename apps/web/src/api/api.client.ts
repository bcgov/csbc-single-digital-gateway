import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URI,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// CSRF: read csrf-token cookie and set X-CSRF-Token header on mutating requests
api.interceptors.request.use((request) => {
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

// 401 response interceptor: redirect to home on auth failure
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // Don't redirect if we're already checking auth state
      const url = error.config?.url ?? "";
      if (!url.includes("/auth/bcsc/me") && !url.includes("/auth/idir/me")) {
        window.location.href = window.location.pathname.startsWith("/admin")
          ? "/admin"
          : "/";
      }
    }
    return Promise.reject(error);
  },
);

# Web Developer Docs

## Configuration

Copy the example env file and fill in the values:

```sh
cp .env.example .env
```

### Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `VITE_APP_NAME` | Application display name | `Single Digital Gateway` |
| `VITE_API_URI` | API base URL used by the HTTP client | `http://localhost:5173/api` |
| `VITE_AUTH_URL` | Direct API URL for auth redirects (bypasses Vite proxy) | `http://localhost:4000` |

In development, the Vite dev server proxies `/api/*` requests to `http://localhost:4000` (see `vite.config.ts`). `VITE_AUTH_URL` is needed because browser redirects (login/logout) must hit the API directly, not through the proxy.

## Authentication

Authentication is handled entirely by the API via the **BFF (Backend-For-Frontend)** pattern. The web app does **not** interact with the OIDC provider directly.

### How It Works

1. **`AuthProvider`** — Wraps the app and calls `GET /auth/me` on mount to check if the user has an active session.
2. **`useAuth()` hook** — Provides `isAuthenticated`, `isLoading`, `user`, `login()`, and `logout()` to components.
3. **Login** — `login()` redirects the browser to `{VITE_AUTH_URL}/auth/login?returnTo=...`. The API handles the OIDC flow and redirects back to the frontend.
4. **Logout** — `logout()` calls `POST /api/auth/logout`, which returns the OIDC end-session URL. The browser then navigates to that URL.
5. **CSRF** — The API sets a `csrf-token` cookie on GET requests. The Axios client reads this cookie and sends it as the `X-CSRF-Token` header on mutating requests.

### Key Files

- `src/features/auth/auth.context.tsx` — `AuthProvider` and `useAuth` hook
- `src/features/auth/auth.types.ts` — `UserProfile` and `AuthState` types
- `src/features/auth/components/sign-in.component.tsx` — Sign-in button
- `src/features/auth/components/sign-out.component.tsx` — Sign-out button

## Tech Stack

- **React 19** with TypeScript
- **TanStack Router** — File-based routing (`src/app/routes/`)
- **TanStack Query** — Server state management
- **Tailwind CSS v4** — Styling
- **Vite** — Build tool with `vite-plugin-runtime-env` for runtime env vars

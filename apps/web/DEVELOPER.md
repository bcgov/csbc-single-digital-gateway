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

Authentication is handled entirely by the API via the **BFF (Backend-For-Frontend)** pattern. The web app does **not** interact with the OIDC provider directly. Two identity providers are supported:

- **BCSC** (BC Services Card) — citizen-facing, routes under `/auth/bcsc/*`
- **IDIR** — internal staff, routes under `/auth/idir/*`

### How It Works

1. **`AuthProvider`** — A shared provider component that accepts an `idpType` (`"bcsc"` or `"idir"`) and a `defaultRedirectPath`. It calls `GET /auth/{idpType}/me` on mount to check if the user has an active session. Supports `lazy` mode for deferred session checks.
2. **`useBcscAuth()` hook** — Provides `isAuthenticated`, `isLoading`, `user`, `login()`, and `logout()` for BCSC (citizen) auth.
3. **`useIdirAuth()` hook** — Same interface as above, for IDIR (staff) auth.
4. **Login** — `login()` redirects the browser to `{VITE_AUTH_URL}/auth/{idpType}/login?returnTo=...`. The API handles the OIDC flow and redirects back to the frontend.
5. **Logout** — `logout()` calls `POST /api/auth/{idpType}/logout`, which returns the OIDC end-session URL. The browser then navigates to that URL.
6. **CSRF** — The API sets a `csrf-token` cookie on GET requests. The Axios client reads this cookie and sends it as the `X-CSRF-Token` header on mutating requests.

### Auth Contexts

The app uses two separate React contexts for authentication:

- **`BcscAuthContext`** — Used by citizen-facing pages. Wrap routes with `<AuthProvider idpType="bcsc" defaultRedirectPath="/">`.
- **`IdirAuthContext`** — Used by admin pages. Wrap routes with `<AuthProvider idpType="idir" defaultRedirectPath="/admin">`.

### Key Files

- `src/features/auth/auth.context.tsx` — `AuthProvider`, `useBcscAuth`, and `useIdirAuth` hooks
- `src/features/auth/auth.types.ts` — `UserProfile`, `AuthState`, and `IdpType` types
- `src/features/auth/components/sign-in.component.tsx` — Sign-in button
- `src/features/auth/components/sign-out.component.tsx` — Sign-out button

## Tech Stack

- **React 19** with TypeScript
- **TanStack Router** — File-based routing (`src/app/routes/`)
- **TanStack Query** — Server state management
- **Tailwind CSS v4** — Styling
- **Vite** — Build tool with `vite-plugin-runtime-env` for runtime env vars
